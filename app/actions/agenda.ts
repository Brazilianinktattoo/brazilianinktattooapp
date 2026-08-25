"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { deleteCalendarEvent, unitColorId, upsertCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
import { STUDIO_OFFSET } from "@/lib/date";

export type AppointmentFormState = {
  error?: string;
};

function friendlyDbError(message: string): string {
  if (message.includes("appointments_no_overlap_per_collaborator")) {
    return "Esse colaborador já tem um agendamento nesse horário.";
  }
  if (message.includes("appointments_no_overlap_per_maca")) {
    return "Essa maca já está ocupada nesse horário.";
  }
  if (message.includes("ends_after_starts")) {
    return "O horário final precisa ser depois do horário inicial.";
  }
  if (message.includes("nao utiliza maca")) {
    return "Body piercer não utiliza maca — deixe o campo em branco.";
  }
  if (message.includes("precisa escolher uma maca")) {
    return "Tatuador precisa escolher uma maca.";
  }
  if (message.includes("nao pertence a unidade")) {
    return "Essa maca não pertence à unidade selecionada.";
  }
  if (message.includes("Acesso de coworking expirado")) {
    return "Seu acesso de coworking expirou ou não foi encontrado.";
  }
  if (message.includes("periodo reservado")) {
    return "Esse horário está fora do período reservado para o seu acesso.";
  }
  if (message.includes("atravessar a meia-noite")) {
    return "O agendamento de maca não pode atravessar a meia-noite.";
  }
  return "Não foi possível salvar o agendamento. Confira os dados e tente de novo.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Avisa todos os admins ativos sempre que um agendamento é criado.
// Best-effort — falha aqui não pode impedir o agendamento.
async function notifyAdminsOfAppointmentCreated(
  supabase: SupabaseServerClient,
  appointmentId: string
) {
  try {
    const { data: info } = await supabase
      .from("appointments")
      .select(
        "client_name, collaborator:profiles!appointments_collaborator_id_fkey(full_name), unit:units(name)"
      )
      .eq("id", appointmentId)
      .maybeSingle<{
        client_name: string;
        collaborator: { full_name: string } | null;
        unit: { name: string } | null;
      }>();

    if (!info) return;

    const collaboratorName = info.collaborator?.full_name || "Colaborador(a)";
    const unitName = info.unit?.name ? ` (${info.unit.name})` : "";
    const message = `Agendamento criado: ${collaboratorName} — ${info.client_name}${unitName}.`;

    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("id, whatsapp_phone")
      .eq("role", "admin")
      .eq("active", true);

    if (!admins || admins.length === 0) return;

    await admin.from("notifications").insert(
      admins.map((a) => ({
        profile_id: a.id,
        appointment_id: appointmentId,
        message,
      }))
    );

    // Envio imediato (não pela fila diária do cron) — best-effort, uma
    // falha de WhatsApp não afeta o sininho nem o agendamento.
    await Promise.all(
      admins
        .filter((a) => a.whatsapp_phone)
        .map((a) => sendWhatsAppMessage(a.whatsapp_phone!, message).catch(() => null))
    );
  } catch {
    // best-effort — não deixa um erro de notificação impedir o agendamento
  }
}

// Mantém um cadastro de cliente por telefone (dedupe natural) sem mudar os
// campos client_name/client_phone já existentes no agendamento — só soma um
// vínculo estável, usado nos relatórios e nas automações de mensagem.
async function upsertClientForAppointment(
  supabase: SupabaseServerClient,
  name: string,
  phone: string,
  birthday: string,
  createdBy: string
): Promise<string | null> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const { data: existing } = await supabase
    .from("clients")
    .select("id, full_name, birthday")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existing) {
    const patch: { full_name?: string; birthday?: string } = {};
    if (name && name !== existing.full_name) patch.full_name = name;
    if (birthday && !existing.birthday) patch.birthday = birthday;
    if (Object.keys(patch).length > 0) {
      await supabase.from("clients").update(patch).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created } = await supabase
    .from("clients")
    .insert({
      full_name: name,
      phone: normalizedPhone,
      birthday: birthday || null,
      created_by: createdBy,
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

// Espelha o agendamento no Google Agenda da unidade (se ela tiver
// google_calendar_id configurado — ver lib/google-calendar.ts). Sempre
// best-effort: nunca lança, uma falha de sync não pode travar o
// agendamento em si.
type AppointmentCalendarSyncRow = {
  unit_id: string;
  client_name: string;
  notes: string;
  starts_at: string;
  ends_at: string;
  status: string;
  google_event_id: string | null;
  unit: { name: string; google_calendar_id: string | null } | null;
  collaborator: { full_name: string } | null;
};

// Uma agenda só pra ambas as unidades — o nome da unidade fica no título
// do evento e a cor (ver unitColorId) diferencia visualmente qual é qual.
async function syncAppointmentToCalendar(
  supabase: SupabaseServerClient,
  appointmentId: string
) {
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "unit_id, client_name, notes, starts_at, ends_at, status, google_event_id, unit:units(name, google_calendar_id), collaborator:profiles(full_name)"
    )
    .eq("id", appointmentId)
    .single<AppointmentCalendarSyncRow>();
  if (!appt) return;

  const calendarId = appt.unit?.google_calendar_id;
  if (!calendarId) return;

  if (appt.status === "cancelado") {
    if (appt.google_event_id) {
      await deleteCalendarEvent(calendarId, appt.google_event_id);
      await supabase
        .from("appointments")
        .update({ google_event_id: null })
        .eq("id", appointmentId);
    }
    return;
  }

  const unitName = appt.unit?.name ?? "";
  const summary = appt.collaborator?.full_name
    ? `${appt.client_name} — ${appt.collaborator.full_name} (${unitName})`
    : `${appt.client_name} (${unitName})`;

  const eventId = await upsertCalendarEvent({
    calendarId,
    eventId: appt.google_event_id,
    summary,
    description: appt.notes || "",
    startISO: appt.starts_at,
    endISO: appt.ends_at,
    colorId: unitColorId(unitName),
  });

  if (eventId && eventId !== appt.google_event_id) {
    await supabase
      .from("appointments")
      .update({ google_event_id: eventId })
      .eq("id", appointmentId);
  }
}

function readAppointmentForm(formData: FormData) {
  const collaborator_id = String(formData.get("collaborator_id") ?? "");
  const unit_id = String(formData.get("unit_id") ?? "");
  const maca_id = String(formData.get("maca_id") ?? "") || null;
  const client_name = String(formData.get("client_name") ?? "").trim();
  const client_phone = String(formData.get("client_phone") ?? "").trim();
  const client_birthday = String(formData.get("client_birthday") ?? "").trim();
  const client_is_own = formData.get("client_is_own") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const starts_at_raw = String(formData.get("starts_at") ?? "");
  const ends_at_raw = String(formData.get("ends_at") ?? "");
  const deposit_amount_raw = String(formData.get("deposit_amount") ?? "0")
    .trim()
    .replace(",", ".");
  const deposit_status = String(formData.get("deposit_status") ?? "pendente");

  if (
    !collaborator_id ||
    !unit_id ||
    !client_name ||
    !starts_at_raw ||
    !ends_at_raw
  ) {
    return {
      error: "Preencha colaborador, unidade, cliente e o horário.",
    } as const;
  }

  // starts_at_raw/ends_at_raw vêm de <input type="datetime-local"> sem fuso
  // ("YYYY-MM-DDTHH:mm") — sempre no horário de Brasília (STUDIO_OFFSET),
  // nunca no fuso do servidor (Vercel roda em UTC).
  const starts_at = new Date(`${starts_at_raw}:00${STUDIO_OFFSET}`);
  const ends_at = new Date(`${ends_at_raw}:00${STUDIO_OFFSET}`);
  if (Number.isNaN(starts_at.getTime()) || Number.isNaN(ends_at.getTime())) {
    return { error: "Horário inválido." } as const;
  }
  if (ends_at <= starts_at) {
    return { error: "O horário final precisa ser depois do inicial." } as const;
  }

  const deposit_amount = deposit_amount_raw === "" ? 0 : Number(deposit_amount_raw);
  if (Number.isNaN(deposit_amount) || deposit_amount < 0) {
    return { error: "Valor do sinal inválido." } as const;
  }
  if (deposit_status !== "pago" && deposit_status !== "pendente") {
    return { error: "Status do sinal inválido." } as const;
  }

  return {
    data: {
      collaborator_id,
      unit_id,
      maca_id,
      client_name,
      client_phone,
      client_is_own,
      notes,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      deposit_amount,
      deposit_status: deposit_status as "pago" | "pendente",
    },
    client_birthday,
  } as const;
}

export async function createAppointment(
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const { user, profile } = await requireProfile();

  const parsed = readAppointmentForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.collaborator_id !== user.id && profile.role !== "admin") {
    return { error: "Você só pode criar agendamentos para você mesmo." };
  }

  const supabase = await createClient();
  const client_id = await upsertClientForAppointment(
    supabase,
    parsed.data.client_name,
    parsed.data.client_phone,
    parsed.client_birthday,
    user.id
  );
  const { data: created, error } = await supabase
    .from("appointments")
    .insert({ ...parsed.data, client_id })
    .select("id")
    .single();

  if (error) return { error: friendlyDbError(error.message) };

  await syncAppointmentToCalendar(supabase, created.id);
  await notifyAdminsOfAppointmentCreated(supabase, created.id);

  revalidatePath("/");
  redirect("/");
}

export async function updateAppointment(
  id: string,
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const { user, profile } = await requireProfile();

  const parsed = readAppointmentForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.collaborator_id !== user.id && profile.role !== "admin") {
    return { error: "Você só pode editar os seus próprios agendamentos." };
  }

  const supabase = await createClient();
  const client_id = await upsertClientForAppointment(
    supabase,
    parsed.data.client_name,
    parsed.data.client_phone,
    parsed.client_birthday,
    user.id
  );
  const { error } = await supabase
    .from("appointments")
    .update({ ...parsed.data, client_id })
    .eq("id", id);

  if (error) return { error: friendlyDbError(error.message) };

  await syncAppointmentToCalendar(supabase, id);

  revalidatePath("/");
  redirect("/");
}

export async function cancelAppointment(id: string) {
  await requireProfile();
  const supabase = await createClient();
  // RLS already restricts this to own appointment (or admin); the update
  // simply affects 0 rows if the caller isn't allowed to touch it.
  await supabase
    .from("appointments")
    .update({ status: "cancelado" })
    .eq("id", id);
  await syncAppointmentToCalendar(supabase, id);
  revalidatePath("/");
}

export async function deleteAppointment(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("google_event_id, unit:units(google_calendar_id)")
    .eq("id", id)
    .maybeSingle<{
      google_event_id: string | null;
      unit: { google_calendar_id: string | null } | null;
    }>();

  await supabase.from("appointments").delete().eq("id", id);

  if (appt?.google_event_id && appt.unit?.google_calendar_id) {
    await deleteCalendarEvent(appt.unit.google_calendar_id, appt.google_event_id);
  }

  revalidatePath("/");
}

export type MacaFormState = {
  error?: string;
};

export async function createMaca(
  _prevState: MacaFormState,
  formData: FormData
): Promise<MacaFormState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const unit_id = String(formData.get("unit_id") ?? "");
  if (!label) return { error: "Dê um nome pra maca." };
  if (!unit_id) return { error: "Selecione a unidade." };

  const supabase = await createClient();
  const { error } = await supabase.from("macas").insert({ label, unit_id });
  if (error) {
    return {
      error: error.message.includes("macas_unit_id_label_key")
        ? "Já existe uma maca com esse nome nessa unidade."
        : "Não foi possível criar a maca.",
    };
  }

  revalidatePath("/macas");
  return {};
}

export async function setMacaActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("macas").update({ active }).eq("id", id);
  revalidatePath("/macas");
  revalidatePath("/");
}

export async function renameMaca(id: string, label: string) {
  await requireAdmin();
  if (!label.trim()) return;
  const supabase = await createClient();
  await supabase.from("macas").update({ label: label.trim() }).eq("id", id);
  revalidatePath("/macas");
  revalidatePath("/");
}

const TIME_RE = /^\d{2}:\d{2}$/;

// Horário de funcionamento da unidade — só informativo, não é mais
// reforçado pela trigger enforce_appointment_rules (o estúdio atende fora
// desse horário e aos domingos quando precisa).
export async function updateUnitHours(unitId: string, opensAt: string, closesAt: string) {
  await requireAdmin();
  if (!TIME_RE.test(opensAt) || !TIME_RE.test(closesAt)) return;
  if (opensAt >= closesAt) return;

  const supabase = await createClient();
  await supabase
    .from("units")
    .update({ opens_at: opensAt, closes_at: closesAt })
    .eq("id", unitId);
  revalidatePath("/macas");
}

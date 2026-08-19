"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

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
  return "Não foi possível salvar o agendamento. Confira os dados e tente de novo.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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

  const starts_at = new Date(starts_at_raw);
  const ends_at = new Date(ends_at_raw);
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
  const { error } = await supabase
    .from("appointments")
    .insert({ ...parsed.data, client_id });

  if (error) return { error: friendlyDbError(error.message) };

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
  revalidatePath("/");
}

export async function deleteAppointment(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", id);
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

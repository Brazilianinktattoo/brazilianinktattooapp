"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { STUDIO_OFFSET } from "@/lib/date";
import type { AnamneseLanguage, FixedFeePeriod } from "@/lib/types/database";

export type CreatePassState = {
  error?: string;
  success?: boolean;
  token?: string;
  anamneseToken?: string;
};

const FIXED_FEE_PERIODS: FixedFeePeriod[] = ["hora", "dia", "semana"];
const ANAMNESE_LANGUAGES: AnamneseLanguage[] = ["portugues", "ingles", "espanhol"];

export async function createPass(
  _prevState: CreatePassState,
  formData: FormData
): Promise<CreatePassState> {
  const { user } = await requireAdmin();

  const unit_id = String(formData.get("unit_id") ?? "");
  const maca_id = String(formData.get("maca_id") ?? "");
  const guest_name = String(formData.get("guest_name") ?? "").trim();
  const guest_contact = String(formData.get("guest_contact") ?? "").trim();
  const starts_at_raw = String(formData.get("starts_at") ?? "");
  const ends_at_raw = String(formData.get("ends_at") ?? "");
  const fixed_fee_raw = String(formData.get("fixed_fee") ?? "0").replace(",", ".");
  const fixed_fee_period = String(
    formData.get("fixed_fee_period") ?? "dia"
  ) as FixedFeePeriod;
  const percentage_raw = String(formData.get("percentage") ?? "0").replace(
    ",",
    "."
  );

  const language = String(formData.get("anamnese_language") ?? "portugues") as AnamneseLanguage;

  if (!unit_id || !maca_id || !guest_name || !starts_at_raw || !ends_at_raw) {
    return { error: "Preencha unidade, maca, nome do visitante e o período." };
  }
  if (!FIXED_FEE_PERIODS.includes(fixed_fee_period)) {
    return { error: "Periodicidade inválida." };
  }
  if (!ANAMNESE_LANGUAGES.includes(language)) {
    return { error: "Selecione o idioma da ficha de anamnese." };
  }

  // Mesma correção de fuso do agendamento normal — o input datetime-local
  // não carrega fuso, sempre representa horário de Brasília.
  const starts_at = new Date(`${starts_at_raw}:00${STUDIO_OFFSET}`);
  const ends_at = new Date(`${ends_at_raw}:00${STUDIO_OFFSET}`);
  if (Number.isNaN(starts_at.getTime()) || Number.isNaN(ends_at.getTime())) {
    return { error: "Período inválido." };
  }
  if (ends_at <= starts_at) {
    return { error: "O fim precisa ser depois do início." };
  }

  const fixed_fee = Number(fixed_fee_raw);
  if (Number.isNaN(fixed_fee) || fixed_fee < 0) {
    return { error: "Valor fixo inválido." };
  }
  const percentage = Number(percentage_raw);
  if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
    return { error: "Percentual inválido (0 a 100)." };
  }

  const token = crypto.randomUUID();
  const password = crypto.randomUUID() + crypto.randomUUID();
  const email = `coworking-${token}@guests.brazilianink.internal`;

  const admin = createAdminClient();
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: guest_name, role: "visitante" },
  });

  if (userError || !created.user) {
    return { error: "Não foi possível criar o acesso do visitante." };
  }

  const supabase = await createClient();
  const { data: pass, error: passError } = await supabase
    .from("coworking_passes")
    .insert({
      profile_id: created.user.id,
      unit_id,
      maca_id,
      guest_name,
      guest_contact,
      guest_email: email,
      guest_password: password,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      fixed_fee,
      fixed_fee_period,
      percentage,
      token,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (passError || !pass) {
    // desfaz o login sombra pra não deixar usuário órfão
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível criar o acesso de coworking." };
  }

  // Bloqueia a maca pelo período todo do passe na agenda principal — sem
  // isso, a reserva só aparecia se o próprio visitante entrasse e
  // agendasse um horário específico (a maioria só chega e usa, sem passar
  // por isso), deixando a maca livre pra qualquer outra pessoa agendar em
  // cima por engano.
  const { data: placeholderAppt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      collaborator_id: created.user.id,
      unit_id,
      maca_id,
      client_name: guest_name,
      client_phone: guest_contact,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      notes: "Bloqueio automático — período reservado de coworking.",
    })
    .select("id")
    .single();

  if (apptError || !placeholderAppt) {
    await supabase.from("coworking_passes").delete().eq("id", pass.id);
    await admin.auth.admin.deleteUser(created.user.id);
    const friendlyError = apptError?.message.includes("atravessar a meia-noite")
      ? "Esse período atravessa a meia-noite — crie um passe separado pra cada dia."
      : "Não foi possível reservar a maca nesse período — confira se ela já não está ocupada.";
    return { error: friendlyError };
  }

  const { data: anamnese } = await supabase
    .from("coworking_anamnese_forms")
    .insert({
      coworking_pass_id: pass.id,
      language,
      full_name: guest_name,
    })
    .select("sign_token")
    .single();

  revalidatePath("/coworking");
  return { success: true, token, anamneseToken: anamnese?.sign_token };
}

export async function reportRevenue(id: string, revenue: number) {
  await requireAdmin();
  if (Number.isNaN(revenue) || revenue < 0) return;
  const supabase = await createClient();
  await supabase
    .from("coworking_passes")
    .update({ reported_revenue: revenue })
    .eq("id", id);
  revalidatePath("/coworking");
  revalidatePath("/relatorios");
}

export async function revokePass(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: pass } = await supabase
    .from("coworking_passes")
    .select("profile_id")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("coworking_passes")
    .update({ ends_at: now })
    .eq("id", id);

  // Encurta (ou cancela, se ainda nem tinha começado) o bloqueio da maca
  // criado junto com o passe, senão a maca continuaria marcada como
  // ocupada até o horário original mesmo depois da revogação.
  if (pass?.profile_id) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("id, starts_at")
      .eq("collaborator_id", pass.profile_id)
      .eq("status", "confirmado")
      .maybeSingle();

    if (appt) {
      if (new Date(appt.starts_at) > new Date(now)) {
        await supabase.from("appointments").update({ status: "cancelado" }).eq("id", appt.id);
      } else {
        await supabase.from("appointments").update({ ends_at: now }).eq("id", appt.id);
      }
    }
  }

  revalidatePath("/coworking");
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/mapa");
}

export async function guestLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/coworking/entrar/erro?motivo=saiu");
}

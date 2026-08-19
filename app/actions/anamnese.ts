"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STUDIO_TZ } from "@/lib/date";
import {
  ANAMNESE_HEALTH_QUESTIONS,
  renderAnamnesePdf,
} from "@/lib/documents/anamnese";
import type {
  AnamneseForm,
  ClientOrigin,
  HealthDeclaration,
  ProcedureType,
} from "@/lib/types/database";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

export type GenerateAnamneseState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export async function generateAnamneseForm(
  _prevState: GenerateAnamneseState,
  formData: FormData
): Promise<GenerateAnamneseState> {
  const { user, profile } = await requireProfile();
  const appointment_id = String(formData.get("appointment_id") ?? "");
  if (!appointment_id) return { error: "Agendamento inválido." };

  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("collaborator_id, client_name, client_phone")
    .eq("id", appointment_id)
    .maybeSingle();

  if (!appointment) return { error: "Agendamento não encontrado." };
  if (appointment.collaborator_id !== user.id && profile.role !== "admin") {
    return { error: "Sem permissão." };
  }

  const { data: existing } = await supabase
    .from("anamnese_forms")
    .select("sign_token, signed_at")
    .eq("appointment_id", appointment_id)
    .maybeSingle();

  if (existing) {
    return { success: true, token: existing.sign_token };
  }

  const { data: created, error } = await supabase
    .from("anamnese_forms")
    .insert({
      appointment_id,
      full_name: appointment.client_name,
      phone: appointment.client_phone,
    })
    .select("sign_token")
    .single();

  if (error || !created) return { error: "Não foi possível gerar a ficha." };

  revalidatePath("/");
  return { success: true, token: created.sign_token };
}

export type AnamneseSignatureState = {
  error?: string;
  success?: boolean;
  isMinor?: boolean;
  minorAuthToken?: string;
};

const ORIGIN_OPTIONS: ClientOrigin[] = [
  "trazido_pelo_tatuador",
  "indicado_pelo_estudio",
  "barra_shopping",
];

function readHealthDeclaration(formData: FormData): HealthDeclaration {
  const result: HealthDeclaration = {};
  for (const q of ANAMNESE_HEALTH_QUESTIONS) {
    result[q.key] = {
      yes: formData.get(`health_${q.key}`) === "sim",
      detail: String(formData.get(`health_${q.key}_detail`) ?? "").trim(),
    };
  }
  return result;
}

export async function submitAnamneseSignature(
  token: string,
  _prevState: AnamneseSignatureState,
  formData: FormData
): Promise<AnamneseSignatureState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "") || null;
  const cpf = String(formData.get("cpf") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const is_minor = formData.get("is_minor") === "sim";
  const procedure_type = String(formData.get("procedure_type") ?? "") as ProcedureType;
  const procedure_description = String(formData.get("procedure_description") ?? "").trim();
  const body_location = String(formData.get("body_location") ?? "").trim();
  const total_amount_raw = String(formData.get("total_amount") ?? "").trim().replace(",", ".");
  const deposit_amount_raw = String(formData.get("deposit_amount") ?? "").trim().replace(",", ".");
  const pregnantRaw = String(formData.get("pregnant") ?? "");
  const alcohol_24h = formData.get("alcohol_24h") === "sim";
  const client_origin = String(formData.get("client_origin") ?? "") as ClientOrigin;
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!full_name) return { error: "Informe o nome completo." };
  if (!birth_date) return { error: "Informe a data de nascimento." };
  if (!cpf) return { error: "Informe o CPF." };
  if (!rg) return { error: "Informe o RG." };
  if (!address) return { error: "Informe o endereço completo." };
  if (!cep) return { error: "Informe o CEP." };
  if (!phone) return { error: "Informe o telefone." };
  if (!email) return { error: "Informe o e-mail." };
  if (!["tatuagem", "piercing", "ambos"].includes(procedure_type)) {
    return { error: "Selecione o tipo de procedimento." };
  }
  if (!procedure_description) {
    return { error: "Descreva o procedimento (desenho/estilo ou jóia)." };
  }
  if (!body_location) return { error: "Informe a localização no corpo." };

  const total_amount = Number(total_amount_raw);
  if (total_amount_raw === "" || Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "Informe o valor total do procedimento." };
  }
  const deposit_amount = Number(deposit_amount_raw);
  if (deposit_amount_raw === "" || Number.isNaN(deposit_amount) || deposit_amount < 0) {
    return { error: "Informe o valor do sinal (0 se não houve sinal)." };
  }

  if (!["nao", "sim", "nao_se_aplica"].includes(pregnantRaw)) {
    return { error: "Responda a pergunta sobre gravidez/amamentação." };
  }
  if (!ORIGIN_OPTIONS.includes(client_origin)) {
    return { error: "Selecione uma das opções de origem do cliente." };
  }
  if (!signer_name) return { error: "Informe seu nome completo na assinatura." };
  if (!agree) return { error: "Confirme que as informações são verdadeiras." };

  const health_declaration = readHealthDeclaration(formData);
  const pregnantLabel =
    pregnantRaw === "sim"
      ? "( ) Não   ( X ) Sim   ( ) Não se aplica"
      : pregnantRaw === "nao_se_aplica"
        ? "( ) Não   ( ) Sim   ( X ) Não se aplica"
        : "( X ) Não   ( ) Sim   ( ) Não se aplica";

  const admin = createAdminClient();

  const { data: form } = await admin
    .from("anamnese_forms")
    .select("*, appointment:appointments(client_name, starts_at, unit_id, collaborator_id)")
    .eq("sign_token", token)
    .maybeSingle<AnamneseForm & {
      appointment: {
        client_name: string;
        starts_at: string;
        unit_id: string;
        collaborator_id: string;
      } | null;
    }>();

  if (!form) return { error: "Link inválido." };
  if (form.signed_at) return { error: "Essa ficha já foi preenchida." };

  let professionalName = "";
  let unitName = "";
  let appointmentDateLabel = "";
  if (form.appointment) {
    const [{ data: collaborator }, { data: unit }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", form.appointment.collaborator_id).maybeSingle(),
      admin.from("units").select("name").eq("id", form.appointment.unit_id).maybeSingle(),
    ]);
    professionalName = collaborator?.full_name ?? "";
    unitName = unit?.name ?? "";
    appointmentDateLabel = dateTimeLabel(new Date(form.appointment.starts_at));
  }

  const signedAt = new Date();
  const pdf = await renderAnamnesePdf({
    fullName: full_name,
    birthDateLabel: birth_date
      ? new Date(`${birth_date}T12:00:00Z`).toLocaleDateString("pt-BR")
      : "",
    cpf,
    rg,
    address,
    cep,
    phone,
    email,
    isMinor: is_minor,
    procedureType: procedure_type,
    procedureDescription: procedure_description,
    bodyLocation: body_location,
    totalAmountLabel: formatCurrency(total_amount),
    depositAmountLabel: formatCurrency(deposit_amount),
    professionalName,
    unitName,
    appointmentDateLabel,
    healthDeclaration: health_declaration,
    pregnantAnswer: pregnantLabel,
    alcohol24h: alcohol_24h,
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(signedAt),
  });

  const file_path = `anamnese/${form.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF da ficha." };

  const { error } = await admin
    .from("anamnese_forms")
    .update({
      full_name,
      birth_date,
      cpf,
      rg,
      address,
      cep,
      phone,
      email,
      is_minor,
      procedure_type,
      procedure_description,
      body_location,
      total_amount,
      deposit_amount,
      health_declaration,
      client_origin,
      file_path,
      signer_name,
      signed_at: signedAt.toISOString(),
    })
    .eq("id", form.id);

  if (error) return { error: "Não foi possível enviar a ficha." };

  if (is_minor) {
    const { data: existingAuth } = await admin
      .from("minor_authorization_forms")
      .select("sign_token")
      .eq("anamnese_form_id", form.id)
      .maybeSingle();

    if (existingAuth) {
      return { success: true, isMinor: true, minorAuthToken: existingAuth.sign_token };
    }

    const { data: authForm } = await admin
      .from("minor_authorization_forms")
      .insert({
        anamnese_form_id: form.id,
        minor_name: full_name,
        minor_birth_date: birth_date,
        minor_phone: phone,
        minor_email: email,
        piercer_name: professionalName,
        body_location,
      })
      .select("sign_token")
      .single();

    if (authForm) {
      return { success: true, isMinor: true, minorAuthToken: authForm.sign_token };
    }
  }

  return { success: true, isMinor: false };
}

export async function getAnamneseForAppointment(appointmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anamnese_forms")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle<AnamneseForm>();
  return data;
}

export async function getAnamnesePdfUrl(filePath: string) {
  await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from("documentos")
    .createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

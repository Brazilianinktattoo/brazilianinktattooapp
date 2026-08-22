"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { STUDIO_TZ } from "@/lib/date";
import {
  healthQuestionsFor,
  renderCoworkingAnamnesePdf,
} from "@/lib/documents/coworking-anamnese";
import type {
  AnamneseLanguage,
  CoworkingAnamneseForm,
  CoworkingProcedureType,
  HealthDeclaration,
} from "@/lib/types/database";

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

function readHealthDeclaration(formData: FormData, language: AnamneseLanguage): HealthDeclaration {
  const result: HealthDeclaration = {};
  for (const q of healthQuestionsFor(language)) {
    result[q.key] = {
      yes: formData.get(`health_${q.key}`) === "sim",
      detail: String(formData.get(`health_${q.key}_detail`) ?? "").trim(),
    };
  }
  return result;
}

export type CoworkingAnamneseSignatureState = {
  error?: string;
  success?: boolean;
};

export async function submitCoworkingAnamneseSignature(
  token: string,
  _prevState: CoworkingAnamneseSignatureState,
  formData: FormData
): Promise<CoworkingAnamneseSignatureState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "") || null;
  const phone = String(formData.get("phone") ?? "").trim();
  const procedure_type = String(formData.get("procedure_type") ?? "") as CoworkingProcedureType;
  const professional_name = String(formData.get("professional_name") ?? "").trim();
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!full_name) return { error: "Informe o nome completo." };
  if (!["tatuagem", "piercing"].includes(procedure_type)) {
    return { error: "Selecione o tipo de procedimento." };
  }
  if (!signer_name) return { error: "Informe seu nome completo na assinatura." };
  if (!agree) return { error: "Confirme que as informações são verdadeiras." };

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("coworking_anamnese_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<CoworkingAnamneseForm>();

  if (!form) return { error: "Link inválido." };
  if (form.signed_at) return { error: "Essa ficha já foi preenchida." };

  const health_declaration = readHealthDeclaration(formData, form.language);
  const signedAt = new Date();

  const pdf = await renderCoworkingAnamnesePdf({
    language: form.language,
    fullName: full_name,
    cpf,
    address,
    cep,
    birthDateLabel: birth_date
      ? new Date(`${birth_date}T12:00:00Z`).toLocaleDateString("pt-BR")
      : "",
    phone,
    procedureType: procedure_type,
    professionalName: professional_name,
    healthDeclaration: health_declaration,
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(signedAt),
  });

  const file_path = `anamnese-coworking/${form.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF." };

  const { error } = await admin
    .from("coworking_anamnese_forms")
    .update({
      full_name,
      cpf,
      address,
      cep,
      birth_date,
      phone,
      procedure_type,
      health_declaration,
      file_path,
      signer_name,
      signed_at: signedAt.toISOString(),
    })
    .eq("id", form.id);

  if (error) return { error: "Não foi possível enviar a ficha." };

  return { success: true };
}

export async function getCoworkingAnamnesePdfUrl(filePath: string) {
  await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("documentos").createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

export type CreateStandaloneAnamneseState = {
  error?: string;
  success?: boolean;
  token?: string;
};

// Ficha em inglês/espanhol gerada direto por qualquer colaborador (não só
// Admin/Chefe de Piercing), sem depender de um acesso de coworking —
// mesmo PDF/idiomas/assinatura, só sem coworking_pass_id.
export async function createStandaloneAnamneseLink(
  _prevState: CreateStandaloneAnamneseState,
  formData: FormData
): Promise<CreateStandaloneAnamneseState> {
  const { user } = await requireProfile();

  const language = String(formData.get("language") ?? "") as AnamneseLanguage;
  if (!["ingles", "espanhol"].includes(language)) {
    return { error: "Selecione o idioma." };
  }
  const full_name = String(formData.get("full_name") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coworking_anamnese_forms")
    .insert({
      coworking_pass_id: null,
      created_by: user.id,
      language,
      full_name,
    })
    .select("sign_token")
    .single();

  if (error || !data) return { error: "Não foi possível gerar o link." };
  return { success: true, token: data.sign_token };
}

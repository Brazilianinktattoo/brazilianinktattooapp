"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { STUDIO_TZ } from "@/lib/date";
import {
  MINOR_HEALTH_QUESTIONS,
  renderMinorAuthorizationPdf,
} from "@/lib/documents/minor-authorization";
import type { HealthDeclaration, MinorAuthorizationForm } from "@/lib/types/database";

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

function dateLabel(raw: string) {
  return raw ? new Date(`${raw}T12:00:00Z`).toLocaleDateString("pt-BR") : "";
}

function readHealthDeclaration(formData: FormData): HealthDeclaration {
  const result: HealthDeclaration = {};
  for (const q of MINOR_HEALTH_QUESTIONS) {
    result[q.key] = {
      yes: formData.get(`health_${q.key}`) === "sim",
      detail: String(formData.get(`health_${q.key}_detail`) ?? "").trim(),
    };
  }
  return result;
}

export type MinorAuthSignatureState = {
  error?: string;
  success?: boolean;
};

export async function submitMinorAuthorizationSignature(
  token: string,
  _prevState: MinorAuthSignatureState,
  formData: FormData
): Promise<MinorAuthSignatureState> {
  const guardian_name = String(formData.get("guardian_name") ?? "").trim();
  const guardian_rg = String(formData.get("guardian_rg") ?? "").trim();
  const guardian_cpf = String(formData.get("guardian_cpf") ?? "").trim();
  const guardian_birth_date = String(formData.get("guardian_birth_date") ?? "") || null;
  const guardian_marital_status = String(formData.get("guardian_marital_status") ?? "").trim();
  const guardian_address = String(formData.get("guardian_address") ?? "").trim();
  const guardian_neighborhood = String(formData.get("guardian_neighborhood") ?? "").trim();
  const guardian_city = String(formData.get("guardian_city") ?? "").trim();
  const guardian_state = String(formData.get("guardian_state") ?? "").trim();
  const guardian_cep = String(formData.get("guardian_cep") ?? "").trim();
  const guardian_phone = String(formData.get("guardian_phone") ?? "").trim();
  const guardian_email = String(formData.get("guardian_email") ?? "").trim();
  const minor_rg = String(formData.get("minor_rg") ?? "").trim();
  const minor_cpf = String(formData.get("minor_cpf") ?? "").trim();
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!guardian_name) return { error: "Informe o nome do responsável." };
  if (!signer_name) return { error: "Informe seu nome completo na assinatura." };
  if (!agree) return { error: "Confirme que as informações são verdadeiras." };

  const minor_health_declaration = readHealthDeclaration(formData);

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("minor_authorization_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<MinorAuthorizationForm>();

  if (!form) return { error: "Link inválido." };
  if (form.signed_at) return { error: "Essa autorização já foi assinada." };

  const signedAt = new Date();
  const pdf = await renderMinorAuthorizationPdf({
    piercerName: form.piercer_name,
    bodyLocation: form.body_location,
    guardianName: guardian_name,
    guardianRg: guardian_rg,
    guardianCpf: guardian_cpf,
    guardianBirthDateLabel: dateLabel(guardian_birth_date ?? ""),
    guardianMaritalStatus: guardian_marital_status,
    guardianAddress: guardian_address,
    guardianNeighborhood: guardian_neighborhood,
    guardianCity: guardian_city,
    guardianState: guardian_state,
    guardianCep: guardian_cep,
    guardianPhone: guardian_phone,
    guardianEmail: guardian_email,
    minorName: form.minor_name,
    minorRg: minor_rg,
    minorCpf: minor_cpf,
    minorBirthDateLabel: form.minor_birth_date
      ? new Date(form.minor_birth_date).toLocaleDateString("pt-BR")
      : "",
    minorPhone: form.minor_phone,
    minorEmail: form.minor_email,
    minorHealthDeclaration: minor_health_declaration,
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(signedAt),
  });

  const file_path = `autorizacao-menor/${form.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF." };

  const { error } = await admin
    .from("minor_authorization_forms")
    .update({
      guardian_name,
      guardian_rg,
      guardian_cpf,
      guardian_birth_date,
      guardian_marital_status,
      guardian_address,
      guardian_neighborhood,
      guardian_city,
      guardian_state,
      guardian_cep,
      guardian_phone,
      guardian_email,
      minor_rg,
      minor_cpf,
      minor_health_declaration,
      file_path,
      signer_name,
      signed_at: signedAt.toISOString(),
    })
    .eq("id", form.id);

  if (error) return { error: "Não foi possível enviar a autorização." };

  return { success: true };
}

export async function getMinorAuthPdfUrl(filePath: string) {
  await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("documentos").createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

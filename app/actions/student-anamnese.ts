"use server";

import { requireAdminOrTatuador, requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STUDIO_TZ } from "@/lib/date";
import { getFormText } from "@/lib/form-texts";
import {
  STUDENT_HEALTH_QUESTIONS,
  renderStudentAnamnesePdf,
} from "@/lib/documents/student-anamnese";
import type { HealthDeclaration, StudentAnamneseForm } from "@/lib/types/database";

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type GenerateStudentAnamneseState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export async function generateStudentAnamneseForm(
  _prevState: GenerateStudentAnamneseState,
  formData: FormData
): Promise<GenerateStudentAnamneseState> {
  const { user } = await requireAdminOrTatuador();

  const student_name = String(formData.get("student_name") ?? "").trim();
  const procedure_location = String(formData.get("procedure_location") ?? "").trim();
  const procedure_type = String(formData.get("procedure_type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const value_raw = String(formData.get("value") ?? "0").trim().replace(",", ".");

  if (!student_name) return { error: "Informe o aluno responsável." };
  if (!procedure_location) return { error: "Informe o local da tattoo/piercing." };
  if (!procedure_type) return { error: "Informe o tipo de procedimento." };

  const value = Number(value_raw);
  if (Number.isNaN(value) || value < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("student_anamnese_forms")
    .insert({
      student_name,
      procedure_location,
      procedure_type,
      notes,
      value,
      created_by: user.id,
    })
    .select("sign_token")
    .single();

  if (error || !created) return { error: "Não foi possível gerar a ficha." };

  return { success: true, token: created.sign_token };
}

export type StudentAnamneseSignatureState = {
  error?: string;
  success?: boolean;
};

function readHealthDeclaration(formData: FormData): HealthDeclaration {
  const result: HealthDeclaration = {};
  for (const q of STUDENT_HEALTH_QUESTIONS) {
    result[q.key] = {
      yes: formData.get(`health_${q.key}`) === "sim",
      detail: String(formData.get(`health_${q.key}_detail`) ?? "").trim(),
    };
  }
  return result;
}

export async function submitStudentAnamneseSignature(
  token: string,
  _prevState: StudentAnamneseSignatureState,
  formData: FormData
): Promise<StudentAnamneseSignatureState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "") || null;
  const address = String(formData.get("address") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const client_origin = String(formData.get("client_origin") ?? "").trim();
  const blood_type = String(formData.get("blood_type") ?? "").trim();
  const photo_authorization = formData.get("photo_authorization") === "on";
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!full_name) return { error: "Informe o nome completo." };
  if (!rg) return { error: "Informe o RG." };
  if (!cpf) return { error: "Informe o CPF." };
  if (!birth_date) return { error: "Informe a data de nascimento." };
  if (!address) return { error: "Informe o endereço." };
  if (!cep) return { error: "Informe o CEP." };
  if (!city) return { error: "Informe a cidade." };
  if (!email) return { error: "Informe o e-mail." };
  if (!whatsapp) return { error: "Informe o WhatsApp." };
  if (!client_origin) return { error: "Informe como nos conheceu." };
  if (!blood_type) return { error: "Informe o tipo sanguíneo e fator RH." };
  if (!signer_name) return { error: "Informe seu nome completo na assinatura." };
  if (!agree) return { error: "Confirme que as informações são verdadeiras." };

  const health_declaration = readHealthDeclaration(formData);

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("student_anamnese_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<StudentAnamneseForm>();

  if (!form) return { error: "Link inválido." };
  if (form.signed_at) return { error: "Essa ficha já foi preenchida." };

  const [consentText, photoAuthorizationText] = await Promise.all([
    getFormText(
      "student_anamnese_consent",
      "Declaro que as informações acima são verdadeiras."
    ),
    getFormText(
      "student_anamnese_photo_authorization",
      "Autorizo o registro fotográfico do trabalho realizado."
    ),
  ]);

  const signedAt = new Date();
  const pdf = await renderStudentAnamnesePdf({
    fullName: full_name,
    rg,
    cpf,
    birthDateLabel: new Date(`${birth_date}T12:00:00Z`).toLocaleDateString("pt-BR"),
    address,
    cep,
    city,
    email,
    whatsapp,
    clientOrigin: client_origin,
    bloodType: blood_type,
    healthDeclaration: health_declaration,
    photoAuthorization: photo_authorization,
    consentText,
    photoAuthorizationText,
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(signedAt),
    procedureLocation: form.procedure_location,
    procedureType: form.procedure_type,
    notes: form.notes,
    studentName: form.student_name,
    value: formatMoney(form.value),
  });

  const file_path = `student-anamnese/${form.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF da ficha." };

  const { error } = await admin
    .from("student_anamnese_forms")
    .update({
      full_name,
      rg,
      cpf,
      birth_date,
      address,
      cep,
      city,
      email,
      whatsapp,
      client_origin,
      blood_type,
      health_declaration,
      photo_authorization,
      file_path,
      signer_name,
      signed_at: signedAt.toISOString(),
    })
    .eq("id", form.id);

  if (error) return { error: "Não foi possível enviar a ficha." };

  return { success: true };
}

export async function getStudentAnamnesePdfUrl(filePath: string) {
  await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from("documentos")
    .createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

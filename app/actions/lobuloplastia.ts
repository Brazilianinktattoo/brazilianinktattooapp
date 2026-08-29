"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrPiercingStaff } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { STUDIO_TZ } from "@/lib/date";
import { getFormText } from "@/lib/form-texts";
import { sendTemplateMessage } from "@/lib/whatsapp/meta-client";
import {
  LOBULOPLASTIA_HEALTH_QUESTIONS,
  DEFAULT_LOBULOPLASTIA_CONSENT_TEXT,
} from "@/lib/documents/lobuloplastia-questions";
import { renderLobuloplastiaPdf } from "@/lib/documents/lobuloplastia";
import type { HealthDeclaration } from "@/lib/types/database";

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

function readHealthDeclaration(formData: FormData): HealthDeclaration {
  const result: HealthDeclaration = {};
  for (const q of LOBULOPLASTIA_HEALTH_QUESTIONS) {
    result[q.key] = {
      yes: formData.get(`health_${q.key}`) === "sim",
      detail: String(formData.get(`health_${q.key}_detail`) ?? "").trim(),
    };
  }
  return result;
}

export type GenerateLobuloplastiaState = {
  error?: string;
  success?: boolean;
  token?: string;
};

// Gerado manualmente pela equipe pra um cliente específico — sem vínculo
// com agendamento (diferente da ficha de anamnese normal), já que
// lobuloplastia é um serviço à parte, de menor volume.
export async function generateLobuloplastiaLink(
  _prevState: GenerateLobuloplastiaState,
  formData: FormData
): Promise<GenerateLobuloplastiaState> {
  const { user } = await requireAdminOrPiercingStaff();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const collaborator_id = String(formData.get("collaborator_id") ?? "") || user.id;

  if (!full_name) return { error: "Informe o nome do cliente." };
  if (!phone) return { error: "Informe o telefone do cliente." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("lobuloplastia_forms")
    .insert({
      full_name,
      phone,
      collaborator_id,
      created_by: user.id,
    })
    .select("sign_token")
    .single();

  if (error || !created) return { error: "Não foi possível gerar a ficha." };

  revalidatePath("/lobuloplastia");
  return { success: true, token: created.sign_token };
}

export type LobuloplastiaSignatureState = {
  error?: string;
  success?: boolean;
};

export async function submitLobuloplastiaSignature(
  token: string,
  _prevState: LobuloplastiaSignatureState,
  formData: FormData
): Promise<LobuloplastiaSignatureState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "") || null;
  const cpf = String(formData.get("cpf") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const social_media = String(formData.get("social_media") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const fenda_description = String(formData.get("fenda_description") ?? "").trim();
  const image_authorization = formData.get("image_authorization") === "on";
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!full_name) return { error: "Informe o nome completo." };
  if (!phone) return { error: "Informe o telefone." };
  if (!signer_name) return { error: "Informe seu nome completo na assinatura." };
  if (!agree) return { error: "Confirme que as informações são verdadeiras." };

  const admin = createAdminClient();

  const { data: form } = await admin
    .from("lobuloplastia_forms")
    .select("id, signed_at, collaborator_id")
    .eq("sign_token", token)
    .maybeSingle();

  if (!form) return { error: "Link inválido." };
  if (form.signed_at) return { error: "Essa ficha já foi assinada." };

  const { data: collaborator } = form.collaborator_id
    ? await admin
        .from("profiles")
        .select("full_name")
        .eq("id", form.collaborator_id)
        .maybeSingle()
    : { data: null };

  const health_declaration = readHealthDeclaration(formData);
  const consentText = await getFormText(
    "lobuloplastia_consent_text",
    DEFAULT_LOBULOPLASTIA_CONSENT_TEXT
  );

  const signedAt = new Date();
  const pdf = await renderLobuloplastiaPdf({
    fullName: full_name,
    birthDateLabel: birth_date
      ? new Date(`${birth_date}T12:00:00Z`).toLocaleDateString("pt-BR")
      : "",
    cpf,
    rg,
    phone,
    socialMedia: social_media,
    address,
    city,
    cep,
    healthDeclaration: health_declaration,
    fendaDescription: fenda_description,
    professionalName: collaborator?.full_name ?? "",
    consentText,
    imageAuthorization: image_authorization,
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(signedAt),
  });

  const file_path = `lobuloplastia/${form.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF." };

  const { error: updateError } = await admin
    .from("lobuloplastia_forms")
    .update({
      full_name,
      birth_date,
      cpf,
      rg,
      social_media,
      address,
      city,
      cep,
      phone,
      health_declaration,
      fenda_description,
      image_authorization,
      signer_name,
      signed_at: signedAt.toISOString(),
      file_path,
    })
    .eq("id", form.id);

  if (updateError) return { error: "Não foi possível salvar a ficha." };

  // Mesmo upsert em clients por telefone que o resto do sistema já faz
  // (ver submitWalkinAnamnese em app/actions/anamnese.ts) — mantém o
  // cadastro do cliente atualizado sem duplicar.
  const { data: existingClient } = await admin
    .from("clients")
    .select("id, full_name, birthday")
    .eq("phone", phone)
    .maybeSingle();

  if (existingClient) {
    const patch: { full_name?: string; birthday?: string } = {};
    if (full_name && full_name !== existingClient.full_name) patch.full_name = full_name;
    if (birth_date && !existingClient.birthday) patch.birthday = birth_date;
    if (Object.keys(patch).length > 0) {
      await admin.from("clients").update(patch).eq("id", existingClient.id);
    }
  } else {
    await admin.from("clients").insert({
      full_name,
      phone,
      birthday: birth_date || null,
      created_by: form.collaborator_id,
    });
  }

  return { success: true };
}

export type LobuloplastiaEntryState = {
  error?: string;
  success?: boolean;
};

export async function addLobuloplastiaSession(
  formId: string,
  _prevState: LobuloplastiaEntryState,
  formData: FormData
): Promise<LobuloplastiaEntryState> {
  const { user } = await requireAdminOrPiercingStaff();

  const session_number = Number(formData.get("session_number") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const entry_date = String(formData.get("entry_date") ?? "") || null;

  if (!Number.isInteger(session_number) || session_number < 1) {
    return { error: "Número de sessão inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lobuloplastia_entries").insert({
    form_id: formId,
    kind: "sessao",
    session_number,
    description,
    entry_date,
    created_by: user.id,
  });

  if (error) return { error: "Não foi possível registrar a sessão." };

  revalidatePath(`/lobuloplastia/ficha/${formId}`);
  return { success: true };
}

export async function addLobuloplastiaEvolutionNote(
  formId: string,
  _prevState: LobuloplastiaEntryState,
  formData: FormData
): Promise<LobuloplastiaEntryState> {
  const { user } = await requireAdminOrPiercingStaff();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Escreva a evolução." };

  const supabase = await createClient();
  const { error } = await supabase.from("lobuloplastia_entries").insert({
    form_id: formId,
    kind: "evolucao",
    description,
    created_by: user.id,
  });

  if (error) return { error: "Não foi possível registrar a evolução." };

  revalidatePath(`/lobuloplastia/ficha/${formId}`);
  return { success: true };
}

export async function getLobuloplastiaPdfUrl(filePath: string) {
  await requireAdminOrPiercingStaff();
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from("documentos")
    .createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

export type SendAftercareResult = { error?: string; success?: boolean };

// Manual — a equipe decide quando o procedimento/sessão terminou e clica
// pra mandar os cuidados pós, em vez de disparar sozinho em algum
// momento arbitrário do fluxo.
export async function sendLobuloplastiaAftercareMessage(
  formId: string
): Promise<SendAftercareResult> {
  await requireAdminOrPiercingStaff();

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("lobuloplastia_forms")
    .select("phone")
    .eq("id", formId)
    .maybeSingle();

  if (!form?.phone) return { error: "Cliente sem telefone cadastrado." };

  const result = await sendTemplateMessage(form.phone, "cuidados_pos_lobuloplastia", []);
  if (!result.ok) return { error: result.error };

  return { success: true };
}

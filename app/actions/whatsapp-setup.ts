"use server";

import { requireAdmin } from "@/lib/auth";
import {
  registerPhoneNumber,
  sendWhatsAppMessage,
  sendTemplateMessage,
  createMessageTemplate,
  MESSAGE_TEMPLATES,
} from "@/lib/whatsapp/meta-client";

export type RegisterNumberState = {
  error?: string;
  success?: boolean;
};

export async function registerWhatsAppNumber(
  _prevState: RegisterNumberState,
  _formData: FormData
): Promise<RegisterNumberState> {
  await requireAdmin();

  const result = await registerPhoneNumber();
  if (!result.ok) {
    return { error: result.error };
  }
  return { success: true };
}

export type SendTestMessageState = {
  error?: string;
  success?: boolean;
};

export async function sendWhatsAppTestMessage(
  _prevState: SendTestMessageState,
  formData: FormData
): Promise<SendTestMessageState> {
  await requireAdmin();

  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) {
    return { error: "Informe um número de telefone." };
  }

  const result = await sendWhatsAppMessage(
    phone,
    "Teste de integração — API oficial do WhatsApp (Brazilian Ink Tattoo)."
  );
  if (!result.ok) {
    return { error: result.error };
  }
  return { success: true };
}

export type SendTemplateTestState = {
  error?: string;
  success?: boolean;
};

export async function sendTemplateTestMessage(
  _prevState: SendTemplateTestState,
  formData: FormData
): Promise<SendTemplateTestState> {
  await requireAdmin();

  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) {
    return { error: "Informe um número de telefone." };
  }

  const result = await sendTemplateMessage(phone, "agendamento_criado_admin", [
    "Colaborador Teste",
    "Cliente Teste",
    "Downtown",
  ]);
  if (!result.ok) {
    return { error: result.error };
  }
  return { success: true };
}

export type CreateTemplatesState = {
  results?: { name: string; ok: boolean; detail: string }[];
};

export async function createWhatsAppTemplates(
  _prevState: CreateTemplatesState,
  _formData: FormData
): Promise<CreateTemplatesState> {
  await requireAdmin();

  const results: { name: string; ok: boolean; detail: string }[] = [];
  for (const def of MESSAGE_TEMPLATES) {
    const result = await createMessageTemplate(def);
    results.push({
      name: def.name,
      ok: result.ok,
      detail: result.ok ? "Enviado pra aprovação" : result.error,
    });
  }

  return { results };
}

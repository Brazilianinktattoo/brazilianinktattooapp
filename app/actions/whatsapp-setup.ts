"use server";

import { requireAdmin } from "@/lib/auth";
import { registerPhoneNumber, sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";

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

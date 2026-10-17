"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
import { REPLY_WINDOW_MS, blockContact, recordOutbound } from "@/lib/whatsapp/inbox";

export type ReplyState = { error?: string; ok?: number };

export async function sendConversationReply(
  phone: string,
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const { user } = await requireAdmin();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Escreva a mensagem." };
  if (text.length > 4000) return { error: "Mensagem muito longa (máx. 4000 caracteres)." };

  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("last_inbound_at")
    .eq("phone", phone)
    .maybeSingle();
  if (!conv) return { error: "Conversa não encontrada." };
  if (!conv.last_inbound_at || Date.now() - new Date(conv.last_inbound_at).getTime() > REPLY_WINDOW_MS) {
    return {
      error:
        "Já passaram mais de 24h desde a última mensagem do cliente — o WhatsApp só permite retomar por mensagem modelo aprovada.",
    };
  }

  const result = await sendWhatsAppMessage(phone, text);
  if (!result.ok) return { error: `Não foi possível enviar: ${result.error}` };

  await recordOutbound(admin, { phone, waMessageId: result.providerId || null, body: text, sentBy: user.id });
  revalidatePath(`/conversas/${phone}`);
  return { ok: Date.now() };
}

export async function markConversationRead(phone: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("whatsapp_conversations").update({ unread_count: 0 }).eq("phone", phone);
  revalidatePath("/conversas");
}

export async function getConversationMediaUrl(path: string) {
  await requireAdmin();
  if (!path.startsWith("whatsapp/")) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from("documentos").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export async function setConversationIgnored(phone: string, ignored: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("whatsapp_conversations")
    .update({ ignored, ...(ignored ? { unread_count: 0 } : {}) })
    .eq("phone", phone);
  revalidatePath("/conversas");
  revalidatePath(`/conversas/${phone}`);
}

export async function blockConversation(phone: string): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const result = await blockContact(phone);
  const admin = createAdminClient();
  if (result.ok) {
    await admin
      .from("whatsapp_conversations")
      .update({ blocked: true, ignored: true, unread_count: 0 })
      .eq("phone", phone);
    revalidatePath("/conversas");
    revalidatePath(`/conversas/${phone}`);
    return { ok: true };
  }
  return {
    error: /24/.test(result.error ?? "") || /window|recent/i.test(result.error ?? "")
      ? "A Meta só deixa bloquear quem escreveu nas últimas 24h."
      : `Não foi possível bloquear: ${result.error}`,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { classifyMedia, sendMediaMessage, sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
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
    error: /re-engagement|24|window|recent/i.test(result.error ?? "")
      ? "A Meta só deixa bloquear quem escreveu nas últimas 24h."
      : `Não foi possível bloquear: ${result.error}`,
  };
}

async function insideWindow(phone: string) {
  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("last_inbound_at")
    .eq("phone", phone)
    .maybeSingle();
  return !!conv?.last_inbound_at && Date.now() - new Date(conv.last_inbound_at).getTime() <= REPLY_WINDOW_MS;
}

// O arquivo vai direto do navegador pro storage (servidor da Vercel não
// aceita corpo grande, e vídeo chega a 16MB) e só depois é repassado pra Meta.
export async function createConversationUpload(phone: string, fileName: string, mime: string, size: number) {
  await requireAdmin();
  const media = classifyMedia(mime);
  if (!media) return { error: "Tipo de arquivo não aceito pelo WhatsApp (use JPG/PNG, MP4, áudio, PDF, Word ou Excel)." };
  if (size > media.maxMb * 1024 * 1024) return { error: `Arquivo grande demais (máx. ${media.maxMb}MB pra esse tipo).` };
  if (!(await insideWindow(phone))) {
    return { error: "Já passaram mais de 24h desde a última mensagem do cliente." };
  }
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `whatsapp/${phone}/out-${crypto.randomUUID()}-${safe}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documentos").createSignedUploadUrl(path);
  if (error || !data) return { error: "Não foi possível preparar o envio." };
  return { path, token: data.token };
}

export async function sendConversationMedia(
  phone: string,
  path: string,
  mime: string,
  fileName: string,
  caption: string
): Promise<ReplyState> {
  const { user } = await requireAdmin();
  const media = classifyMedia(mime);
  if (!media || !path.startsWith(`whatsapp/${phone}/out-`)) return { error: "Arquivo inválido." };
  if (!(await insideWindow(phone))) {
    return { error: "Já passaram mais de 24h desde a última mensagem do cliente." };
  }

  const admin = createAdminClient();
  const { data: blob, error: dlError } = await admin.storage.from("documentos").download(path);
  if (dlError || !blob) return { error: "Não foi possível ler o arquivo enviado." };

  const result = await sendMediaMessage(
    phone,
    { bytes: await blob.arrayBuffer(), mime, name: fileName },
    media.kind,
    caption.trim() || undefined
  );
  if (!result.ok) {
    await admin.storage.from("documentos").remove([path]);
    return { error: `Não foi possível enviar: ${result.error}` };
  }

  await recordOutbound(admin, {
    phone,
    waMessageId: result.providerId || null,
    body: caption.trim() || (media.kind === "document" ? fileName : ""),
    type: media.kind,
    sentBy: user.id,
    mediaPath: path,
    mime,
  });
  revalidatePath(`/conversas/${phone}`);
  return { ok: Date.now() };
}

import { createAdminClient } from "@/lib/supabase/server";
import { sendTemplateMessage } from "@/lib/whatsapp/meta-client";

type Admin = ReturnType<typeof createAdminClient>;

const GRAPH = "https://graph.facebook.com/v21.0";
const MEDIA_BUCKET = "documentos";

// A Meta às vezes devolve celular brasileiro sem o 9º dígito (55 + DDD + 8
// dígitos). Uniformiza pra 13 dígitos pra não duplicar a conversa.
export function canonicalPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 12 && /[6-9]/.test(d[4])) {
    return `${d.slice(0, 4)}9${d.slice(4)}`;
  }
  if (d.length === 10 || d.length === 11) return canonicalPhone(`55${d}`);
  return d;
}

export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

type InboundMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { id: string; mime_type?: string; caption?: string };
  video?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string };
  document?: { id: string; mime_type?: string; caption?: string; filename?: string };
  sticker?: { id: string; mime_type?: string };
  reaction?: { emoji?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

function describe(m: InboundMessage): { body: string | null; mediaId?: string; mime?: string } {
  switch (m.type) {
    case "text":
      return { body: m.text?.body ?? "" };
    case "image":
      return { body: m.image?.caption ?? null, mediaId: m.image?.id, mime: m.image?.mime_type };
    case "video":
      return { body: m.video?.caption ?? null, mediaId: m.video?.id, mime: m.video?.mime_type };
    case "audio":
      return { body: null, mediaId: m.audio?.id, mime: m.audio?.mime_type };
    case "sticker":
      return { body: null, mediaId: m.sticker?.id, mime: m.sticker?.mime_type };
    case "document":
      return {
        body: m.document?.caption ?? m.document?.filename ?? null,
        mediaId: m.document?.id,
        mime: m.document?.mime_type,
      };
    case "reaction":
      return { body: m.reaction?.emoji ? `Reagiu com ${m.reaction.emoji}` : null };
    case "button":
      return { body: m.button?.text ?? "" };
    case "interactive":
      return { body: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "" };
    default:
      return { body: null };
  }
}

const PREVIEW: Record<string, string> = {
  image: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  sticker: "Figurinha",
  document: "📄 Documento",
};

async function downloadMedia(admin: Admin, mediaId: string, phone: string, mime?: string) {
  const token = process.env.META_WHATSAPP_TOKEN;
  if (!token) return null;
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meta.ok) return null;
    const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
    if (!url) return null;
    const file = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!file.ok) return null;
    const ext = (mime_type ?? mime ?? "").split("/")[1]?.split(";")[0] || "bin";
    const path = `whatsapp/${phone}/${mediaId}.${ext}`;
    const { error } = await admin.storage
      .from(MEDIA_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: mime_type ?? mime,
        upsert: true,
      });
    return error ? null : path;
  } catch {
    return null;
  }
}

async function findClient(admin: Admin, phone: string) {
  const tail = phone.slice(-8);
  const { data } = await admin
    .from("clients")
    .select("id, full_name, phone")
    .like("phone", `%${tail}`)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function ensureConversation(admin: Admin, phone: string, profileName?: string) {
  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("phone, display_name, client_id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) {
    if (!existing.client_id) {
      const c = await findClient(admin, phone);
      if (c) {
        await admin
          .from("whatsapp_conversations")
          .update({ client_id: c.id, display_name: c.full_name })
          .eq("phone", phone);
      }
    }
    return;
  }
  const c = await findClient(admin, phone);
  await admin.from("whatsapp_conversations").insert({
    phone,
    client_id: c?.id ?? null,
    display_name: c?.full_name ?? profileName ?? null,
  });
}

// Processa o payload cru da Meta: grava mensagens recebidas, atualiza o
// status das enviadas e avisa os admins quando chega resposta nova.
export async function processWebhookPayload(payload: unknown) {
  const admin = createAdminClient();
  const changes =
    (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })?.entry?.flatMap(
      (e) => e.changes ?? []
    ) ?? [];

  for (const ch of changes) {
    const value = ch.value as {
      metadata?: { phone_number_id?: string };
      messages?: InboundMessage[];
      contacts?: { wa_id: string; profile?: { name?: string } }[];
      statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
    };

    // Só aceita eventos do nosso número oficial.
    const ourNumber = process.env.META_PHONE_NUMBER_ID;
    if (ourNumber && value.metadata?.phone_number_id !== ourNumber) continue;

    for (const s of value.statuses ?? []) {
      await admin
        .from("whatsapp_messages")
        .update({
          status: s.status,
          error: s.status === "failed" ? (s.errors?.[0]?.title ?? "Falha na entrega") : null,
        })
        .eq("wa_message_id", s.id)
        .eq("direction", "out");
    }

    for (const m of value.messages ?? []) {
      const phone = canonicalPhone(m.from);
      const profileName = value.contacts?.find((c) => canonicalPhone(c.wa_id) === phone)?.profile?.name;
      await ensureConversation(admin, phone, profileName);

      const d = describe(m);
      const mediaPath = d.mediaId ? await downloadMedia(admin, d.mediaId, phone, d.mime) : null;
      const at = new Date(Number(m.timestamp) * 1000).toISOString();

      const { error } = await admin.from("whatsapp_messages").insert({
        wa_message_id: m.id,
        phone,
        direction: "in",
        type: m.type,
        body: d.body,
        media_id: d.mediaId ?? null,
        media_path: mediaPath,
        mime_type: d.mime ?? null,
        status: "received",
        created_at: at,
      });
      if (error) continue; // duplicata (a Meta reenvia) — não conta de novo

      const preview = d.body?.slice(0, 80) || PREVIEW[m.type] || "Mensagem";
      const { data: conv } = await admin
        .from("whatsapp_conversations")
        .select("unread_count, display_name, last_admin_alert_at")
        .eq("phone", phone)
        .single();
      await admin
        .from("whatsapp_conversations")
        .update({
          last_message_at: at,
          last_inbound_at: at,
          last_preview: preview,
          unread_count: (conv?.unread_count ?? 0) + 1,
        })
        .eq("phone", phone);

      // Reações não são conversa — não acordam ninguém.
      if (m.type === "reaction") continue;
      await notifyAdmins(admin, phone, conv?.display_name ?? profileName ?? phone, preview, conv?.last_admin_alert_at);
    }
  }
}

async function notifyAdmins(
  admin: Admin,
  phone: string,
  name: string,
  preview: string,
  lastAlertAt?: string | null
) {
  const { data: admins } = await admin
    .from("profiles")
    .select("id, whatsapp_phone")
    .eq("role", "admin")
    .eq("active", true);
  if (!admins?.length) return;

  await admin.from("notifications").insert(
    admins.map((a) => ({ profile_id: a.id, message: `💬 ${name}: ${preview}` }))
  );

  // Alerta por WhatsApp pros admins (chega com a tela travada) — no máximo
  // um a cada 10 min por conversa, pra não encher nem gerar cobrança à toa.
  if (lastAlertAt && Date.now() - new Date(lastAlertAt).getTime() < 10 * 60 * 1000) return;
  await admin
    .from("whatsapp_conversations")
    .update({ last_admin_alert_at: new Date().toISOString() })
    .eq("phone", phone);
  await Promise.all(
    admins
      .filter((a) => a.whatsapp_phone)
      .map((a) =>
        sendTemplateMessage(a.whatsapp_phone!, "nova_mensagem_cliente", [name]).catch(() => null)
      )
  );
}

export async function recordOutbound(
  admin: Admin,
  args: {
    phone: string;
    waMessageId: string | null;
    body: string;
    type?: string;
    sentBy?: string | null;
    mediaPath?: string | null;
    mime?: string | null;
  }
) {
  const phone = canonicalPhone(args.phone);
  await ensureConversation(admin, phone);
  await admin.from("whatsapp_messages").insert({
    wa_message_id: args.waMessageId || null,
    phone,
    direction: "out",
    type: args.type ?? "text",
    body: args.body,
    media_path: args.mediaPath ?? null,
    mime_type: args.mime ?? null,
    status: "sent",
    sent_by: args.sentBy ?? null,
  });
  await admin
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString(), last_preview: args.body.slice(0, 80) })
    .eq("phone", phone);
}

import { toWhatsAppE164 } from "./format-phone";

export type SendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

// PAUSADO em 23/08/2026: o número do estúdio foi bloqueado pelo WhatsApp
// (conta em análise) — provavelmente por causa do padrão de mensagens
// automáticas via WAME (não é a API oficial da Meta). Enquanto a análise
// não termina, nenhum envio sai daqui (fila do cron, avisos de admin,
// nada) — assim não corre o risco de uma rajada de mensagens acumuladas
// disparar bem na hora em que o WhatsApp decide, e piorar o bloqueio.
// Reverter (apagar esse bloco) só depois de confirmar que o número está
// liberado, ou trocar pela API oficial do WhatsApp Business.
const WHATSAPP_PAUSED = true;

// Integração com a WAME API (número dedicado, conectado por QR Code).
// A key da instância vai na própria URL — não tem header de autenticação.
export async function sendWhatsAppMessage(phoneDigits: string, body: string): Promise<SendResult> {
  if (WHATSAPP_PAUSED) {
    return { ok: false, error: "Envios de WhatsApp pausados manualmente (número em análise)." };
  }

  const baseUrl = process.env.WAME_API_BASE_URL || "https://us.api-wa.me";
  const key = process.env.WAME_API_KEY;

  if (!key) {
    return {
      ok: false,
      error: "WAME API não configurada — falta WAME_API_KEY no .env.local.",
    };
  }

  const phone = toWhatsAppE164(phoneDigits);

  try {
    const res = await fetch(`${baseUrl}/${key}/message/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text: body }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `WAME API respondeu ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      messageId?: string;
      key?: { id?: string };
    };
    return { ok: true, providerId: data.id ?? data.messageId ?? data.key?.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha desconhecida ao enviar." };
  }
}

import { toWhatsAppE164 } from "./format-phone";

export type SendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

function getPhoneNumberId(): string | undefined {
  return process.env.META_PHONE_NUMBER_ID;
}

function getAccessToken(): string | undefined {
  return process.env.META_WHATSAPP_TOKEN;
}

// Ativação única do número na API oficial da Meta — precisa rodar uma vez
// antes do número aceitar enviar/receber mensagens. Usa o PIN de verificação
// em duas etapas escolhido durante o cadastro do número no WhatsApp Manager.
export async function registerPhoneNumber(): Promise<SendResult> {
  const phoneNumberId = getPhoneNumberId();
  const token = getAccessToken();
  const pin = process.env.META_WHATSAPP_REGISTER_PIN;

  if (!phoneNumberId || !token || !pin) {
    return {
      ok: false,
      error:
        "Faltam variáveis de ambiente: META_PHONE_NUMBER_ID, META_WHATSAPP_TOKEN ou META_WHATSAPP_REGISTER_PIN.",
    };
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string };
    };

    if (!res.ok || !data.success) {
      return {
        ok: false,
        error: data.error?.message || `Meta respondeu ${res.status} sem sucesso.`,
      };
    }

    return { ok: true, providerId: phoneNumberId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha desconhecida ao registrar." };
  }
}

// Integração com a API oficial do WhatsApp Business (Cloud API da Meta).
export async function sendWhatsAppMessage(phoneDigits: string, body: string): Promise<SendResult> {
  const phoneNumberId = getPhoneNumberId();
  const token = getAccessToken();

  if (!phoneNumberId || !token) {
    return {
      ok: false,
      error: "API do WhatsApp não configurada — falta META_PHONE_NUMBER_ID ou META_WHATSAPP_TOKEN.",
    };
  }

  const phone = toWhatsAppE164(phoneDigits);

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Meta API respondeu ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
    };
    return { ok: true, providerId: data.messages?.[0]?.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha desconhecida ao enviar." };
  }
}

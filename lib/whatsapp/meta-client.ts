import { toWhatsAppE164 } from "./format-phone";

export type SendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const WABA_ID = "1069624022667369";

function getPhoneNumberId(): string | undefined {
  return process.env.META_PHONE_NUMBER_ID;
}

function getAccessToken(): string | undefined {
  return process.env.META_WHATSAPP_TOKEN;
}

export type MessageTemplateDef = {
  name: string;
  category: "UTILITY" | "MARKETING";
  bodyText: string;
  exampleParams?: string[];
};

// Modelos aprovados pela Meta — necessários pra mandar mensagem fora da
// janela de 24h após o cliente/admin ter mandado mensagem pro número do
// estúdio (fora dessa janela, texto livre não é entregue).
export const MESSAGE_TEMPLATES: MessageTemplateDef[] = [
  {
    name: "agendamento_criado_admin",
    category: "UTILITY",
    bodyText:
      "📅 Novo agendamento registrado no sistema do estúdio Brazilian Ink Tattoo.\n\nProfissional: {{1}}\nCliente: {{2}}\nUnidade: {{3}}\n\nConfira os detalhes completos no painel administrativo do sistema.",
    exampleParams: ["Jansen de Almeida", "Maria Souza", "Barra Shopping"],
  },
  {
    name: "comanda_aberta_admin",
    category: "UTILITY",
    bodyText:
      "🧾 Uma nova comanda foi aberta no sistema do estúdio Brazilian Ink Tattoo.\n\nProfissional: {{1}}\nCliente: {{2}}\nUnidade: {{3}}\n\nConfira os detalhes completos no painel administrativo do sistema.",
    exampleParams: ["Jansen de Almeida", "Maria Souza", "Barra Shopping"],
  },
  {
    name: "feliz_aniversario_cliente",
    category: "MARKETING",
    bodyText:
      "Feliz aniversário, {{1}}! 🎉🖤\n\nA equipe do Brazilian Ink Tattoo deseja a você um dia incrível, cheio de boas energias!\n\nTemos um presente muito especial pra você — basta entrar em contato conosco e retirar seu presente! 🎁\n\nEsperamos te ver em breve. Um abraço da família BIT! 🖤",
    exampleParams: ["Maria"],
  },
  {
    name: "promocao_sazonal",
    category: "MARKETING",
    bodyText:
      "🎉 {{1}}\n\nCondições especiais da nossa equipe:\n🖋️ Tatuagem: {{2}}\n💎 Piercing: {{3}}\n\nEntre em contato conosco pra aproveitar! 🖤",
    exampleParams: ["Halloween chegando! 🎃", "20% de desconto", "50% de desconto"],
  },
  {
    name: "pos_tattoo_dia1",
    category: "UTILITY",
    bodyText:
      "Olá! Sua tattoo está fresquinha 💛 Antes de mais nada, obrigado por nos deixar fazer parte da sua história! Nas próximas horas, alguns cuidados são essenciais:\n\n🩹 O filme protetor deve ficar na pele por até 4 dias — se acumular muito líquido embaixo, remova com água morna antes disso\n🚫 Evite tocar, coçar ou deixar a região em contato com roupas apertadas\n🚿 Ao tomar banho, evite jato de água direto na tattoo\n🌊 Não esqueça dos cuidados indicados pelo seu tatuador(a): evite água do mar, piscina, sauna e exposição ao sol durante a cicatrização\n\n⚠️ Se notar muito calor ou dor no local, vermelhidão excessiva ou muito inchaço, fale com seu tatuador(a) ou com a gente — estamos aqui pra te ajudar no que for preciso.\n\nUm abraço da família BIT! 🖤",
  },
  {
    name: "pos_tattoo_dia7",
    category: "UTILITY",
    bodyText:
      "Olá! Já faz uma semana da sua tattoo 💛 Essa é a fase em que a pele começa a descamar — é normal, não arranque, deixe soltar sozinha.\n\nLembrando: depois que o filme protetor sair por completo, aplique uma fina camada de hidratante da sua escolha, e evite sol direto na região.\n\nQualquer dúvida, fale com seu tatuador(a) ou com a gente!\n\nEsperamos te ver em breve. Até lá! 🖤",
  },
  {
    name: "pos_tattoo_dia15",
    category: "UTILITY",
    bodyText:
      "Olá! Já faz 15 dias da sua tattoo — como está a cicatrização? 💛 Nessa fase a pele já deve estar bem menos sensível, mas continue hidratando e usando protetor solar sempre que for se expor ao sol.\n\nQualquer dúvida, fale com seu tatuador(a) ou com a gente!\n\nEsperamos te ver em breve. Até lá! 🖤",
  },
  {
    name: "pos_tattoo_dia30",
    category: "UTILITY",
    bodyText:
      "Olá! Um mês da sua nova tattoo 🎉 A essa altura ela já deve estar praticamente cicatrizada por completo. Continue hidratando a pele e usando protetor solar pra manter as cores vivas por muito mais tempo.\n\nEsperamos que esteja amando o resultado! Qualquer dúvida, estamos por aqui.\n\nUm abraço da família BIT! 🖤",
  },
  {
    name: "pos_tattoo_dia60",
    category: "UTILITY",
    bodyText:
      "Olá! Já se passaram 60 dias da sua tattoo — esperamos que esteja 100% cicatrizada e que você esteja curtindo muito o resultado 🖤\n\nFicamos muito felizes em fazer parte dessa marca na sua história. Se puder, adoraríamos ver como ficou — manda uma fotinho pra gente!\n\nSempre que quiser voltar pra fazer mais uma, é só chamar. Um abraço da família Brazilian Ink Tattoo! 🖤",
  },
  {
    name: "cuidados_pos_lobuloplastia",
    category: "UTILITY",
    bodyText:
      "Cuidados pós-lobulomodelação auricular 🖤\n\nCurativo: mantenha por 7 dias e não molhe em hipótese alguma — pode interferir no resultado e infeccionar o local.\n\n- Após 7 dias, use Cicaplast Baume B5 (La Roche-Posay) 2x ao dia\n- Use protetor solar se for se expor ao sol (senão a pele escurece)\n- Não use álcool, iodo, água oxigenada ou outra pomada além da indicada\n- Não use maquiagem ou perfume no local\n- Não arranque as casquinhas — faz parte da cicatrização\n- Não abra o furo pra ver se fechou\n- Evite sol no primeiro mês\n- A partir do 7º dia, no banho, pode higienizar com sabonete neutro, sem esfregar\n- Não use brincos no furo durante o tratamento\n- Envie foto semanalmente pra equipe\n\nRetorno para a próxima sessão: 30 dias. Qualquer dúvida, fale com a gente! 🖤",
  },
];

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
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
      };
    };

    if (!res.ok || !data.success) {
      const e = data.error;
      const detail = e
        ? ` [type=${e.type ?? "?"} code=${e.code ?? "?"} subcode=${e.error_subcode ?? "?"} trace=${e.fbtrace_id ?? "?"}]`
        : "";
      return {
        ok: false,
        error: `${e?.message || `Meta respondeu ${res.status} sem sucesso.`}${detail}`,
      };
    }

    return { ok: true, providerId: phoneNumberId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha desconhecida ao registrar." };
  }
}

// Submete um modelo de mensagem pra aprovação da Meta (leva minutos a
// algumas horas). Idempotente na prática — se o modelo já existe com esse
// nome/idioma, a Meta responde com erro informativo, não duplica.
export async function createMessageTemplate(def: MessageTemplateDef): Promise<SendResult> {
  const token = getAccessToken();
  if (!token) {
    return { ok: false, error: "Falta META_WHATSAPP_TOKEN." };
  }

  const components: Record<string, unknown>[] = [
    {
      type: "BODY",
      text: def.bodyText,
      ...(def.exampleParams
        ? { example: { body_text: [def.exampleParams] } }
        : {}),
    },
  ];

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${WABA_ID}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: def.name,
        language: "pt_BR",
        category: def.category,
        components,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; error_user_msg?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.error_user_msg || data.error?.message || `Meta respondeu ${res.status}.`,
      };
    }

    return { ok: true, providerId: data.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha desconhecida ao criar modelo." };
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

// Envia usando um modelo aprovado pela Meta — funciona mesmo fora da janela
// de 24h após a última mensagem do destinatário (ao contrário de
// sendWhatsAppMessage, que só entrega texto livre dentro dessa janela).
export async function sendTemplateMessage(
  phoneDigits: string,
  templateName: string,
  bodyParams: string[] = []
): Promise<SendResult> {
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
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          ...(bodyParams.length > 0
            ? {
                components: [
                  {
                    type: "body",
                    parameters: bodyParams.map((text) => ({ type: "text", text })),
                  },
                ],
              }
            : {}),
        },
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

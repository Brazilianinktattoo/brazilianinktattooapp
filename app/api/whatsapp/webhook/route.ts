import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Webhook da Meta pro número oficial do estúdio — recebe atualização de
// status de cada mensagem enviada (sent/delivered/read/failed, com o
// motivo do erro quando falha) e mensagens recebidas. Configurar em
// developers.facebook.com → app → WhatsApp → Configuration → Webhook:
// Callback URL = https://<domínio>/api/whatsapp/webhook, Verify Token =
// o mesmo valor de META_WEBHOOK_VERIFY_TOKEN, inscrever no campo
// "messages".

// A Meta chama isso uma vez, na hora de configurar o webhook, pra
// confirmar que o dono do endpoint realmente controla o token escolhido.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

// A cada evento (status de entrega ou mensagem recebida), a Meta faz um
// POST aqui. Só grava o payload cru — sem isso não tinha como saber por
// que uma mensagem "aceita" pela API nunca chegava no telefone.
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (payload) {
    try {
      const admin = createAdminClient();
      await admin.from("whatsapp_webhook_events").insert({ payload });
    } catch {
      // best-effort — nunca falha a resposta pra Meta por causa disso
    }
  }

  // Sempre 200: um erro aqui faria a Meta re-tentar agressivamente o
  // mesmo evento.
  return NextResponse.json({ received: true });
}

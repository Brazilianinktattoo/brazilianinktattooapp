import { NextResponse, type NextRequest } from "next/server";
import { dispatchPendingBatch } from "@/lib/whatsapp/dispatch";

// Endpoint pra um cron externo (Vercel Cron, pg_cron + pg_net, cron-job.org
// etc.) chamar periodicamente uma vez o app estiver publicado — cada
// chamada processa um lote (lib/whatsapp/dispatch.ts::BATCH_SIZE); o
// intervalo do próprio agendamento faz o papel da pausa entre lotes.
// Sem isso publicado, o disparo automático (aniversário/pós-tattoo) só sai
// quando o admin clica em "Enviar pendentes agora" na tela de Mensagens.
function checkAuth(request: NextRequest) {
  const secret = process.env.WHATSAPP_DISPATCH_SECRET;
  const auth = request.headers.get("authorization");
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

// Vercel Cron só faz GET, e injeta "Authorization: Bearer $CRON_SECRET"
// automaticamente — configure CRON_SECRET na Vercel com o mesmo valor de
// WHATSAPP_DISPATCH_SECRET pra isso funcionar sem terceiros.
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchPendingBatch();
  return NextResponse.json(result);
}

// POST continua disponível pra outros crons (pg_cron + pg_net, cron-job.org).
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchPendingBatch();
  return NextResponse.json(result);
}

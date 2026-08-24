import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "./meta-client";
import type { MessageQueueItem } from "@/lib/types/database";

// Proteção contra bloqueio: um lote por chamada (até BATCH_SIZE contatos),
// com um intervalo curto entre mensagens dentro do lote. A pausa MAIOR
// entre lotes fica a cargo de quem chama esta função repetidamente — o
// painel manual espera alguns segundos entre chamadas, e um cron externo
// (uma vez publicado o app) faria o mesmo via intervalo do agendamento.
export const BATCH_SIZE = 50;
const PER_MESSAGE_DELAY_MS = 2500;
const MAX_ATTEMPTS = 3;

export type DispatchResult = {
  sent: number;
  failed: number;
  remaining: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchPendingBatch(): Promise<DispatchResult> {
  const supabase = createAdminClient();

  const { data: batch } = await supabase
    .from("message_queue")
    .select("*, client:clients(id, full_name, phone)")
    .in("status", ["pendente", "erro"])
    .lt("send_attempts", MAX_ATTEMPTS)
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)
    .returns<(MessageQueueItem & { client: { id: string; full_name: string; phone: string } | null })[]>();

  const items = batch ?? [];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    if (!item.client?.phone) {
      await supabase
        .from("message_queue")
        .update({
          status: "erro",
          send_attempts: item.send_attempts + 1,
          last_error: "Cliente sem telefone cadastrado.",
        })
        .eq("id", item.id);
      failed++;
      continue;
    }

    const result = await sendWhatsAppMessage(item.client.phone, item.body);

    if (result.ok) {
      await supabase
        .from("message_queue")
        .update({
          status: "enviada",
          sent_at: new Date().toISOString(),
          send_attempts: item.send_attempts + 1,
          provider_message_id: result.providerId || null,
          last_error: null,
        })
        .eq("id", item.id);
      sent++;
    } else {
      await supabase
        .from("message_queue")
        .update({
          status: "erro",
          send_attempts: item.send_attempts + 1,
          last_error: result.error,
        })
        .eq("id", item.id);
      failed++;
    }

    if (items.indexOf(item) < items.length - 1) {
      await sleep(PER_MESSAGE_DELAY_MS);
    }
  }

  const { count } = await supabase
    .from("message_queue")
    .select("id", { count: "exact", head: true })
    .in("status", ["pendente", "erro"])
    .lt("send_attempts", MAX_ATTEMPTS);

  return { sent, failed, remaining: count ?? 0 };
}

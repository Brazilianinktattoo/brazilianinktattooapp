"use client";

import { useTransition } from "react";
import { markMessageSent, cancelMessage, retryMessage } from "@/app/actions/mensagens";
import type { MessageQueueItemWithClient } from "@/lib/types/database";

const KIND_LABEL: Record<string, string> = {
  aniversario: "Aniversário",
  pos_tattoo_1: "Pós-tattoo 1d",
  pos_tattoo_7: "Pós-tattoo 7d",
  pos_tattoo_15: "Pós-tattoo 15d",
  pos_tattoo_30: "Pós-tattoo 30d",
  pos_tattoo_60: "Pós-tattoo 60d",
  promocao: "Promoção",
};

export function QueueRow({ item }: { item: MessageQueueItemWithClient }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{item.client?.full_name ?? "—"}</span>
          <span className="text-xs text-neutral-500">{item.client?.phone}</span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
            {KIND_LABEL[item.kind] ?? item.kind}
          </span>
          {item.status === "erro" && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
              Erro ({item.send_attempts}x)
            </span>
          )}
        </div>
        <p className="mt-1 max-w-xl text-sm text-neutral-300">{item.body}</p>
        {item.status === "erro" && item.last_error && (
          <p className="mt-1 max-w-xl text-xs text-red-400">{item.last_error}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.status === "erro" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => retryMessage(item.id))}
            className="rounded-lg border border-gold-soft/40 px-3 py-1.5 text-xs text-gold hover:border-gold disabled:opacity-60"
          >
            Tentar novamente
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => markMessageSent(item.id))}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-3 py-1.5 text-xs font-medium text-neutral-950 hover:to-copper disabled:opacity-60"
        >
          Marcar como enviada
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => cancelMessage(item.id))}
          className="text-xs text-neutral-500 hover:text-white disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

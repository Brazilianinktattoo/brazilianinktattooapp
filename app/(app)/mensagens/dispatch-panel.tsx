"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dispatchPendingMessagesBatch } from "@/app/actions/whatsapp-dispatch";

const BETWEEN_BATCH_PAUSE_MS = 15000;

type Status = "idle" | "sending" | "waiting" | "done";

export function DispatchPanel({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [totals, setTotals] = useState({ sent: 0, failed: 0 });
  const [remaining, setRemaining] = useState(pendingCount);
  const stopRef = useRef(false);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function run() {
    stopRef.current = false;
    setStatus("sending");
    setTotals({ sent: 0, failed: 0 });

    let sentTotal = 0;
    let failedTotal = 0;

    while (!stopRef.current) {
      setStatus("sending");
      const result = await dispatchPendingMessagesBatch();
      sentTotal += result.sent;
      failedTotal += result.failed;
      setTotals({ sent: sentTotal, failed: failedTotal });
      setRemaining(result.remaining);
      router.refresh();

      if (result.remaining === 0 || stopRef.current) break;
      setStatus("waiting");
      await sleep(BETWEEN_BATCH_PAUSE_MS);
    }

    setStatus("done");
  }

  const running = status === "sending" || status === "waiting";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        {status === "idle" && (
          <span className="text-neutral-400">
            {pendingCount} mensage{pendingCount === 1 ? "m" : "ns"} pendente
            {pendingCount === 1 ? "" : "s"} pra enviar via WhatsApp.
          </span>
        )}
        {status === "sending" && (
          <span className="text-neutral-300">
            Enviando lote... {totals.sent} enviadas, {totals.failed} falharam, {remaining} restantes.
          </span>
        )}
        {status === "waiting" && (
          <span className="text-neutral-300">
            Pausa entre lotes ({totals.sent} enviadas até agora, {remaining} restantes)...
          </span>
        )}
        {status === "done" && (
          <span className="text-neutral-300">
            Concluído: {totals.sent} enviadas, {totals.failed} falharam.
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!running ? (
          <button
            type="button"
            disabled={pendingCount === 0 && status !== "done"}
            onClick={run}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-1.5 text-sm font-medium text-neutral-950 hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            Enviar pendentes agora
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              stopRef.current = true;
            }}
            className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Parar
          </button>
        )}
      </div>
    </div>
  );
}

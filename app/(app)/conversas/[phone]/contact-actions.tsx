"use client";

import { useState, useTransition } from "react";
import { blockConversation, setConversationIgnored } from "@/app/actions/conversas";

export function ContactActions({
  phone,
  ignored,
  blocked,
}: {
  phone: string;
  ignored: boolean;
  blocked: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const btn =
    "rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={btn}
        onClick={() => start(() => setConversationIgnored(phone, !ignored))}
      >
        {ignored ? "Voltar a ser cliente" : "Não é cliente"}
      </button>
      {!blocked && (
        <button
          type="button"
          disabled={pending}
          className={btn}
          onClick={() =>
            start(async () => {
              if (!confirm("Bloquear esse número? Ele não vai conseguir mais escrever pro estúdio.")) return;
              const r = await blockConversation(phone);
              setMsg(r.error ?? "Número bloqueado.");
            })
          }
        >
          Bloquear
        </button>
      )}
      {blocked && <span className="text-sm text-red-400">Bloqueado</span>}
      {msg && <span className="text-sm text-neutral-400">{msg}</span>}
    </div>
  );
}

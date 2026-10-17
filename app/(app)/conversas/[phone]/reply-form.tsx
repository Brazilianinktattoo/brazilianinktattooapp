"use client";

import { useActionState, useEffect, useRef } from "react";
import { markConversationRead, sendConversationReply, type ReplyState } from "@/app/actions/conversas";

export function ReplyForm({ phone, canReply }: { phone: string; canReply: boolean }) {
  const [state, action, pending] = useActionState(sendConversationReply.bind(null, phone), {} as ReplyState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    markConversationRead(phone);
  }, [phone]);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!canReply) {
    return (
      <p className="rounded-xl border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-300">
        Passaram mais de 24h desde a última mensagem do cliente. O WhatsApp só permite retomar por mensagem
        modelo aprovada — espere ele escrever de novo.
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <textarea
          name="text"
          rows={2}
          required
          placeholder="Escreva sua resposta..."
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

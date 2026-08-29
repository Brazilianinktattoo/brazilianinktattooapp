"use client";

import { useState } from "react";
import { sendLobuloplastiaAftercareMessage } from "@/app/actions/lobuloplastia";

export function SendAftercareButton({ formId }: { formId: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setResult(null);
          const res = await sendLobuloplastiaAftercareMessage(formId);
          setPending(false);
          setResult(
            res.success
              ? { ok: true, message: "Cuidados pós-procedimento enviados por WhatsApp." }
              : { ok: false, message: res.error ?? "Não foi possível enviar." }
          );
        }}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar cuidados pós por WhatsApp"}
      </button>
      {result && (
        <p className={`text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

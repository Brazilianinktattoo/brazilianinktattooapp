"use client";

import { useState } from "react";
import { deleteComanda } from "@/app/actions/comandas";

export function DeleteComandaButton({
  comandaId,
  clientName,
}: {
  comandaId: string;
  clientName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (
            !confirm(
              `Excluir definitivamente a comanda de ${clientName}? Essa ação não pode ser desfeita.`
            )
          ) {
            return;
          }
          setPending(true);
          setError(null);
          const result = await deleteComanda(comandaId);
          setPending(false);
          if (result?.error) setError(result.error);
        }}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-500 hover:border-red-800 hover:text-red-400 disabled:opacity-60"
      >
        {pending ? "Excluindo..." : "Excluir comanda"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}

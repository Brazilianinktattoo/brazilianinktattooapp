"use client";

import { useTransition } from "react";
import { deleteComanda } from "@/app/actions/comandas";

export function DeleteComandaButton({
  comandaId,
  clientName,
}: {
  comandaId: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Excluir definitivamente a comanda de ${clientName}? Essa ação não pode ser desfeita.`
          )
        ) {
          startTransition(() => deleteComanda(comandaId));
        }
      }}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-500 hover:border-red-800 hover:text-red-400 disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "Excluir comanda"}
    </button>
  );
}

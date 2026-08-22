"use client";

import { useTransition } from "react";
import { deleteAnamneseForm } from "@/app/actions/anamnese";

export function DeleteFichaButton({ id, clientName }: { id: string; clientName: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Excluir definitivamente a ficha de ${clientName}? O PDF também será apagado. Essa ação não pode ser desfeita.`
          )
        ) {
          startTransition(() => deleteAnamneseForm(id));
        }
      }}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-500 hover:border-red-800 hover:text-red-400 disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}

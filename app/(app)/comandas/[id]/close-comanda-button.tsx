"use client";

import { useTransition } from "react";
import { closeComanda } from "@/app/actions/comandas";

export function CloseComandaButton({ comandaId }: { comandaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Fechar esta comanda? Não será mais possível editar os itens.")) {
          startTransition(() => closeComanda(comandaId));
        }
      }}
      className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Fechando..." : "Fechar comanda"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { setComandaClientIsOwn } from "@/app/actions/comandas";

export function ClientIsOwnToggle({
  comandaId,
  override,
  effective,
}: {
  comandaId: string;
  override: boolean | null;
  effective: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const value = override === null ? "auto" : override ? "sim" : "nao";

  return (
    <div className="flex flex-col gap-1.5 border-t border-neutral-800 pt-2 text-sm text-neutral-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="client_is_own_override">Cliente próprio do tatuador</label>
        <select
          id="client_is_own_override"
          value={value}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value;
            startTransition(() =>
              setComandaClientIsOwn(comandaId, v === "auto" ? null : v === "sim")
            );
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        >
          <option value="auto">{override === null ? `Automático pela ficha (${effective ? "sim" : "não"})` : "Automático (pela ficha)"}</option>
          <option value="sim">Sim — fui eu quem trouxe</option>
          <option value="nao">Não — cliente do estúdio</option>
        </select>
      </div>
      <p className="text-xs text-neutral-500">
        Define a comissão no Downtown (70% cliente próprio, 50% do estúdio) e vale
        por cima do que o cliente marcou na ficha.
      </p>
    </div>
  );
}

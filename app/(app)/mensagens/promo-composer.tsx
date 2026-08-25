"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPromoBroadcast, type PromoBroadcastState } from "@/app/actions/mensagens";
import type { Unit } from "@/lib/types/database";

const initialState: PromoBroadcastState = {};

export function PromoComposer({ units }: { units: Unit[] }) {
  const [state, formAction, pending] = useActionState(createPromoBroadcast, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm text-neutral-300">
          Título da data comemorativa
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ex: Halloween chegando! 🎃"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tattoo_offer" className="text-sm text-neutral-300">
            Oferta — Tatuagem
          </label>
          <input
            id="tattoo_offer"
            name="tattoo_offer"
            required
            placeholder="Ex: 20% de desconto"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="piercing_offer" className="text-sm text-neutral-300">
            Oferta — Piercing
          </label>
          <input
            id="piercing_offer"
            name="piercing_offer"
            required
            placeholder="Ex: 50% de desconto"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Se não tiver oferta pra um dos dois, escreva algo como "sem promoção
        dessa vez" nesse campo.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit_id" className="text-sm text-neutral-300">
            Unidade (opcional)
          </label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue=""
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos os clientes</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Só quem já foi na {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inactive_days" className="text-sm text-neutral-300">
            Não vêm há pelo menos (dias, opcional)
          </label>
          <input
            id="inactive_days"
            name="inactive_days"
            type="number"
            min="1"
            placeholder="Ex: 60"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-400">
          {state.count} cliente(s) adicionado(s) à fila de envio abaixo.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Adicionando..." : "Adicionar à fila de envio"}
      </button>
    </form>
  );
}

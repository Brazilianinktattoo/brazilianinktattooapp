"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createJewelryCatalogItem,
  type JewelryFormState,
} from "@/app/actions/jewelry";
import { JEWELRY_CATEGORIES } from "@/lib/jewelry-import";

const initialState: JewelryFormState = {};

export function NewJewelryForm() {
  const [state, formAction, pending] = useActionState(
    createJewelryCatalogItem,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-neutral-300">
          Tipo da jóia
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex: Argola titânio 8mm"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm text-neutral-300">
          Código
        </label>
        <input
          id="code"
          name="code"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm text-neutral-300">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          list="jewelry-categories-new"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
        <datalist id="jewelry-categories-new">
          {JEWELRY_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="material" className="text-sm text-neutral-300">
          Material
        </label>
        <input
          id="material"
          name="material"
          placeholder="Ex: TT Natural"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cost_value" className="text-sm text-neutral-300">
          Custo (R$)
        </label>
        <input
          id="cost_value"
          name="cost_value"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="price_venda" className="text-sm text-neutral-300">
          Venda (R$)
        </label>
        <input
          id="price_venda"
          name="price_venda"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="price_aplicacao" className="text-sm text-neutral-300">
          Aplicação (R$)
        </label>
        <input
          id="price_aplicacao"
          name="price_aplicacao"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="price_troca" className="text-sm text-neutral-300">
          Troca (R$)
        </label>
        <input
          id="price_troca"
          name="price_troca"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="sm:col-span-4 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Cadastrar jóia"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createStockEntry,
  type StockEntryFormState,
} from "@/app/actions/estoque";
import type { Product } from "@/lib/types/database";

const initialState: StockEntryFormState = {};

export function NewEntryForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState(
    createStockEntry,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product_id" className="text-sm text-neutral-300">
          Produto
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          defaultValue=""
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quantity" className="text-sm text-neutral-300">
          Quantidade
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm text-neutral-300">
          Observação (opcional)
        </label>
        <input
          id="note"
          name="note"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        <div className="text-sm">
          {state.error && <p className="text-red-400">{state.error}</p>}
          {state.success && (
            <p className="text-green-400">Entrada registrada.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Registrando..." : "Registrar entrada"}
        </button>
      </div>
    </form>
  );
}

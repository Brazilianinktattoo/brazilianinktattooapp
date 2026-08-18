"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  addProduct,
  removeProduct,
  type ComandaProductState,
} from "@/app/actions/comandas";
import type { ComandaProductWithRelations, Product } from "@/lib/types/database";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const initialState: ComandaProductState = {};

export function ComandaProducts({
  comandaId,
  items,
  products,
  canEdit,
}: {
  comandaId: string;
  items: ComandaProductWithRelations[];
  products: Product[];
  canEdit: boolean;
}) {
  const addAction = addProduct.bind(null, comandaId);
  const [state, formAction, pending] = useActionState(addAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-semibold text-white">Produtos utilizados</h2>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum produto lançado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">
                {i.product?.name ?? "—"}{" "}
                <span className="text-neutral-500">× {i.quantity}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-300">
                  {formatMoney(i.quantity * i.unit_price)}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => removeProduct(comandaId, i.id))
                    }
                    className="text-red-400 hover:text-red-300"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end text-sm text-neutral-400">
            Subtotal: {formatMoney(total)}
          </div>
        </div>
      )}

      {canEdit && (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-3"
        >
          <div className="flex flex-1 flex-col gap-1.5">
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
                  {p.name} ({p.quantity} em estoque)
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quantity" className="text-sm text-neutral-300">
              Qtd.
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={1}
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit_price" className="text-sm text-neutral-300">
              Valor unit. (R$)
            </label>
            <input
              id="unit_price"
              name="unit_price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={0}
              className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Adicionando..." : "Adicionar"}
          </button>
          {state.error && (
            <p className="w-full text-sm text-red-400">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

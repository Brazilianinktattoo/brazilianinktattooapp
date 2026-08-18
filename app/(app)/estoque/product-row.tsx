"use client";

import { useState, useTransition } from "react";
import {
  updateProductMinStock,
  setProductActive,
} from "@/app/actions/estoque";
import type { Product } from "@/lib/types/database";

export function ProductRow({ product }: { product: Product }) {
  const [minStock, setMinStock] = useState(product.min_stock);
  const [active, setActive] = useState(product.active);
  const [pending, startTransition] = useTransition();
  const low = product.quantity < product.min_stock;

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-3 pl-4 pr-4">
        <div className="text-neutral-100">{product.name}</div>
        <div className="text-xs text-neutral-500">
          {product.code}
          {product.category === "piercing" && (
            <span className="ml-2 rounded-full bg-purple-500/15 px-2 py-0.5 text-purple-300">
              Piercing
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4">
        <span className={low ? "font-medium text-red-400" : "text-neutral-200"}>
          {product.quantity}
        </span>
        {low && (
          <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
            Estoque baixo
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={minStock}
          disabled={pending}
          onChange={(e) => setMinStock(Number(e.target.value))}
          onBlur={() => {
            if (minStock !== product.min_stock) {
              startTransition(() =>
                updateProductMinStock(product.id, minStock)
              );
            }
          }}
          className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !active;
            setActive(next);
            startTransition(() => setProductActive(product.id, next));
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            active
              ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
              : "bg-neutral-700/40 text-neutral-400 hover:bg-neutral-700/60"
          }`}
        >
          {active ? "Ativo" : "Desativado"}
        </button>
      </td>
    </tr>
  );
}

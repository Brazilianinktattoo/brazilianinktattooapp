"use client";

import { useState, useTransition } from "react";
import { updateJewelryFields, setJewelryActive } from "@/app/actions/jewelry";
import { JEWELRY_CATEGORIES } from "@/lib/jewelry-import";
import type { JewelryCatalogItem } from "@/lib/types/database";

function TextCell({
  value,
  onCommit,
  pending,
  width = "w-28",
  list,
}: {
  value: string;
  onCommit: (v: string) => void;
  pending: boolean;
  width?: string;
  list?: string;
}) {
  const [local, setLocal] = useState(value);
  return (
    <input
      value={local}
      list={list}
      disabled={pending}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      className={`${width} rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold disabled:opacity-60`}
    />
  );
}

function NumberCell({
  value,
  onCommit,
  pending,
}: {
  value: number;
  onCommit: (v: number) => void;
  pending: boolean;
}) {
  const [local, setLocal] = useState(value);
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={local}
      disabled={pending}
      onChange={(e) => setLocal(Number(e.target.value))}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
    />
  );
}

export function JewelryRow({ item }: { item: JewelryCatalogItem }) {
  const [active, setActive] = useState(item.active);
  const [pending, startTransition] = useTransition();

  function commit(field: string, value: string | number) {
    startTransition(() => updateJewelryFields(item.id, { [field]: value }));
  }

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-2 pl-4 pr-2 text-neutral-100 whitespace-nowrap">{item.name}</td>
      <td className="py-2 pr-2">
        <TextCell value={item.code} pending={pending} width="w-20" onCommit={(v) => commit("code", v)} />
      </td>
      <td className="py-2 pr-2">
        <TextCell
          value={item.barcode}
          pending={pending}
          width="w-24"
          onCommit={(v) => commit("barcode", v)}
        />
      </td>
      <td className="py-2 pr-2">
        <TextCell
          value={item.category}
          pending={pending}
          width="w-36"
          list="jewelry-categories"
          onCommit={(v) => commit("category", v)}
        />
        <datalist id="jewelry-categories">
          {JEWELRY_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </td>
      <td className="py-2 pr-2">
        <TextCell
          value={item.material}
          pending={pending}
          width="w-32"
          onCommit={(v) => commit("material", v)}
        />
      </td>
      <td className="py-2 pr-2">
        <NumberCell value={item.stock_quantity} pending={pending} onCommit={(v) => commit("stock_quantity", v)} />
      </td>
      <td className="py-2 pr-2">
        <NumberCell value={item.cost_value} pending={pending} onCommit={(v) => commit("cost_value", v)} />
      </td>
      <td className="py-2 pr-2">
        <NumberCell value={item.price_venda} pending={pending} onCommit={(v) => commit("price_venda", v)} />
      </td>
      <td className="py-2 pr-2">
        <NumberCell
          value={item.price_aplicacao}
          pending={pending}
          onCommit={(v) => commit("price_aplicacao", v)}
        />
      </td>
      <td className="py-2 pr-4">
        <NumberCell value={item.price_troca} pending={pending} onCommit={(v) => commit("price_troca", v)} />
      </td>
      <td className="py-2 pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !active;
            setActive(next);
            startTransition(() => setJewelryActive(item.id, next));
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

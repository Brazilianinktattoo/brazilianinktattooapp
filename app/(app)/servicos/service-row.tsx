"use client";

import { useState, useTransition } from "react";
import { updateServicePrice, setServiceActive } from "@/app/actions/services";
import type { Service } from "@/lib/types/database";

const SUBCATEGORY_LABEL: Record<string, string> = {
  so_perfuracao: "Só perfuração",
  perfuracao_joia: "Perfuração + joia",
  joia_titanio: "Joia — Titânio",
  joia_aco: "Joia — Aço Cirúrgico",
};

export function ServiceRow({ service }: { service: Service }) {
  const [price, setPrice] = useState(service.price);
  const [active, setActive] = useState(service.active);
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-3 pl-4 pr-4">
        <div className="text-neutral-100">{service.name}</div>
        {service.category === "piercing" && (
          <span className="mt-1 inline-block rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-300">
            Piercing
          </span>
        )}
        {service.subcategory && (
          <span className="mt-1 ml-1 inline-block rounded-full bg-neutral-700/40 px-2 py-0.5 text-xs text-neutral-300">
            {SUBCATEGORY_LABEL[service.subcategory] ?? service.subcategory}
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          disabled={pending}
          onChange={(e) => setPrice(Number(e.target.value))}
          onBlur={() => {
            if (price !== service.price) {
              startTransition(() => updateServicePrice(service.id, price));
            }
          }}
          className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !active;
            setActive(next);
            startTransition(() => setServiceActive(service.id, next));
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

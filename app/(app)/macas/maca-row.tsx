"use client";

import { useState, useTransition } from "react";
import { renameMaca, setMacaActive } from "@/app/actions/agenda";
import type { Maca } from "@/lib/types/database";

export function MacaRow({ maca }: { maca: Maca }) {
  const [label, setLabel] = useState(maca.label);
  const [active, setActive] = useState(maca.active);
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-3 pl-4 pr-4">
        <input
          value={label}
          disabled={pending}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label.trim() && label !== maca.label) {
              startTransition(() => renameMaca(maca.id, label));
            }
          }}
          className="w-48 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !active;
            setActive(next);
            startTransition(() => setMacaActive(maca.id, next));
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            active
              ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
              : "bg-neutral-700/40 text-neutral-400 hover:bg-neutral-700/60"
          }`}
        >
          {active ? "Ativa" : "Desativada"}
        </button>
      </td>
    </tr>
  );
}

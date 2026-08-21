"use client";

import { useState, useTransition } from "react";
import { updateComandaCommission } from "@/app/actions/comandas";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CommissionRow({
  comandaId,
  computedAmount,
  savedAmount,
  canEdit,
}: {
  comandaId: string;
  computedAmount: number;
  savedAmount: number | null;
  canEdit: boolean;
}) {
  const displayAmount = savedAmount ?? computedAmount;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(displayAmount));
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <div className="flex items-center justify-between">
        <span>Comissão</span>
        <span className="text-neutral-100">{money(displayAmount)}</span>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span>Comissão</span>
        <div className="flex items-center gap-2">
          <span className="text-neutral-100">
            {money(displayAmount)}
            {savedAmount !== null && (
              <span className="ml-1 text-xs text-amber-400">(ajustada)</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setValue(String(displayAmount));
              setEditing(true);
            }}
            className="text-xs text-neutral-500 hover:text-gold"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span>Comissão</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const amount = Number(value);
            if (Number.isNaN(amount) || amount < 0) return;
            startTransition(async () => {
              await updateComandaCommission(comandaId, amount);
              setEditing(false);
            });
          }}
          className="text-xs text-gold hover:text-gold-strong disabled:opacity-60"
        >
          Salvar
        </button>
        {savedAmount !== null && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await updateComandaCommission(comandaId, null);
                setEditing(false);
              });
            }}
            className="text-xs text-neutral-500 hover:text-red-400 disabled:opacity-60"
          >
            Usar automático
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="text-xs text-neutral-500 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

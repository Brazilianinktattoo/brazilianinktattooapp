"use client";

import { useState } from "react";
import { updateComandaUnit } from "@/app/actions/comandas";
import type { Unit } from "@/lib/types/database";

export function EditComandaUnitForm({
  comandaId,
  unitId,
  units,
}: {
  comandaId: string;
  unitId: string | null;
  units: Unit[];
}) {
  const [value, setValue] = useState(unitId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setSuccess(false);
        const result = await updateComandaUnit(comandaId, value);
        setPending(false);
        if (result.error) setError(result.error);
        else setSuccess(true);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="comanda_unit" className="text-sm text-neutral-300">
          Local de atendimento
        </label>
        <select
          id="comanda_unit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          {!unitId && <option value="">Selecione...</option>}
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending || !value || value === unitId}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar local"}
      </button>
      <p className="w-full text-xs text-neutral-500">
        O local define a comissão (Barra Shopping = 50%) e os relatórios por unidade.
      </p>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
      {success && <p className="w-full text-xs text-green-400">Local atualizado.</p>}
    </form>
  );
}

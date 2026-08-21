"use client";

import { useActionState, useMemo, useState } from "react";
import {
  openComandaFromClient,
  type OpenComandaFromClientState,
} from "@/app/actions/comandas";
import type { Maca, Unit } from "@/lib/types/database";

const initialState: OpenComandaFromClientState = {};

export function OpenComandaForm({
  clientName,
  clientPhone,
  collaboratorId,
  collaboratorName,
  units,
  macas,
  needsMaca,
}: {
  clientName: string;
  clientPhone: string;
  collaboratorId: string;
  collaboratorName: string;
  units: Unit[];
  macas: Maca[];
  needsMaca: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    openComandaFromClient,
    initialState
  );
  const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");
  const macasInUnit = useMemo(
    () => macas.filter((m) => m.unit_id === unitId),
    [macas, unitId]
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 max-w-md rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <input type="hidden" name="client_name" value={clientName} />
      <input type="hidden" name="client_phone" value={clientPhone} />
      <input type="hidden" name="collaborator_id" value={collaboratorId} />

      <p className="text-sm text-neutral-400">
        Profissional: <span className="text-neutral-200">{collaboratorName}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit_id" className="text-sm text-neutral-300">
          Unidade
        </label>
        <select
          id="unit_id"
          name="unit_id"
          required
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {needsMaca && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maca_id" className="text-sm text-neutral-300">
            Maca
          </label>
          <select
            id="maca_id"
            name="maca_id"
            required
            disabled={!unitId}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {macasInUnit.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Abrindo..." : "Abrir comanda"}
      </button>
    </form>
  );
}

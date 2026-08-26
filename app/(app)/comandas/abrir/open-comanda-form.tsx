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
  isPiercingRole = false,
  hasAnamnese = true,
}: {
  clientName: string;
  clientPhone: string;
  collaboratorId: string;
  collaboratorName: string;
  units: Unit[];
  macas: Maca[];
  needsMaca: boolean;
  isPiercingRole?: boolean;
  hasAnamnese?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    openComandaFromClient,
    initialState
  );
  const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");
  const [involvesPiercing, setInvolvesPiercing] = useState(hasAnamnese);
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

      {isPiercingRole && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
          <label className="flex items-start gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="involves_piercing"
              checked={involvesPiercing}
              disabled={!hasAnamnese}
              onChange={(e) => setInvolvesPiercing(e.target.checked)}
              className="mt-0.5"
            />
            Este atendimento envolve perfuração?
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            {hasAnamnese
              ? "Desmarque se for só venda/troca de jóia ou outro serviço sem perfuração — nesse caso a ficha de anamnese não é exigida."
              : `${clientName} ainda não tem ficha de anamnese. Sem perfuração no atendimento (só jóia/outro serviço), pode abrir a comanda mesmo assim.`}
          </p>
        </div>
      )}

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

      <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-neutral-800 p-4">
        <div className="rounded-lg border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-300 sm:col-span-2">
          Preencha os dois valores abaixo pra conseguir abrir a comanda. Se
          não teve sinal, digite <strong>0,00</strong> no campo do sinal —
          não deixe em branco.
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="total_amount" className="text-sm text-neutral-300">
            Valor total do procedimento (R$)
          </label>
          <input
            id="total_amount"
            name="total_amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            placeholder="0,00"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deposit_amount" className="text-sm text-neutral-300">
            Valor do sinal (R$)
          </label>
          <input
            id="deposit_amount"
            name="deposit_amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            placeholder="0,00"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
          <p className="text-xs text-neutral-500">0,00 significa que não teve sinal.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deposit_status" className="text-sm text-neutral-300">
            Status do sinal
          </label>
          <select
            id="deposit_status"
            name="deposit_status"
            defaultValue="pendente"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>

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

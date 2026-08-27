"use client";

import { useActionState, useMemo, useState } from "react";
import {
  openComandaFromClient,
  type OpenComandaFromClientState,
} from "@/app/actions/comandas";
import type { Maca, Unit, UserRole } from "@/lib/types/database";

const initialState: OpenComandaFromClientState = {};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
};

type CollaboratorOption = { id: string; full_name: string; role: UserRole };

function isPiercing(role: string | undefined) {
  return role === "piercer" || role === "chefe_piercing";
}

function needsMacaFor(role: string | undefined) {
  return role === "tatuador" || role === "admin";
}

export function OpenComandaForm({
  clientName,
  clientPhone,
  collaboratorId,
  collaboratorName,
  collaborators = [],
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
  collaborators?: CollaboratorOption[];
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
  const [serviceType, setServiceType] = useState(hasAnamnese ? "perfuracao" : "venda_joia");
  const [paperAnamnese, setPaperAnamnese] = useState(false);
  // Só admin recebe a lista completa (via prop) — pra todo mundo, o
  // profissional já vem fixo do contexto (própria conta, ou anamnese do
  // cliente no caso do Chefe de Piercing).
  const canChooseCollaborator = collaborators.length > 0;
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState(collaboratorId);
  const selectedRole = canChooseCollaborator
    ? collaborators.find((c) => c.id === selectedCollaboratorId)?.role
    : undefined;
  const effectiveNeedsMaca = canChooseCollaborator ? needsMacaFor(selectedRole) : needsMaca;
  const effectiveIsPiercingRole = canChooseCollaborator ? isPiercing(selectedRole) : isPiercingRole;
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

      {canChooseCollaborator ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Profissional
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            value={selectedCollaboratorId}
            onChange={(e) => setSelectedCollaboratorId(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"} — {ROLE_LABEL[c.role] ?? c.role}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <input type="hidden" name="collaborator_id" value={collaboratorId} />
          <p className="text-sm text-neutral-400">
            Profissional: <span className="text-neutral-200">{collaboratorName}</span>
          </p>
        </>
      )}

      {canChooseCollaborator && !hasAnamnese && (
        <label className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm text-neutral-300">
          <input
            type="checkbox"
            name="paper_anamnese"
            checked={paperAnamnese}
            onChange={(e) => setPaperAnamnese(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Atendimento especial — ficha de anamnese assinada em papel (não
            digital)
            <span className="mt-1 block text-xs text-neutral-500">
              Marque só se o cliente já assinou uma ficha física de verdade —
              isso libera abrir a comanda sem a ficha digital.
            </span>
          </span>
        </label>
      )}

      {effectiveIsPiercingRole && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
          <label htmlFor="service_type" className="text-sm text-neutral-300">
            Tipo de atendimento
          </label>
          <select
            id="service_type"
            name="service_type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            <option value="perfuracao" disabled={!hasAnamnese && !paperAnamnese}>
              Perfuração / outro procedimento invasivo
            </option>
            <option value="venda_joia">Venda de jóia</option>
            <option value="troca_joia">Troca de jóia</option>
            <option value="retirada_joia">Retirada de jóia</option>
            <option value="recolocacao_joia">Recolocação de jóia</option>
            <option value="led_terapia">Led Terapia</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            {hasAnamnese || paperAnamnese
              ? 'Só "Perfuração / outro procedimento invasivo" exige ficha de anamnese assinada — os demais tipos abrem direto, só com nome e telefone.'
              : `${clientName} ainda não tem ficha de anamnese. Escolha um dos tipos sem perfuração pra abrir mesmo assim, ou gere e assine a ficha antes.`}
          </p>
        </div>
      )}

      {!effectiveIsPiercingRole && !hasAnamnese && !paperAnamnese && (
        <p className="rounded-lg border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-300">
          {clientName} ainda não tem ficha de anamnese preenchida — só body
          piercers podem abrir sem ela, ou marque acima que foi assinada em
          papel (atendimento especial).
        </p>
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

      {effectiveNeedsMaca && (
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

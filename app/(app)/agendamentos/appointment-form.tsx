"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { AppointmentFormState } from "@/app/actions/agenda";
import type { Appointment, Maca, Unit, UserRole } from "@/lib/types/database";

type CollaboratorOption = {
  id: string;
  full_name: string;
  role: UserRole;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const initialState: AppointmentFormState = {};

export function AppointmentForm({
  action,
  appointment,
  collaborators,
  units,
  macas,
  currentUser,
  defaultDate,
}: {
  action: (
    state: AppointmentFormState,
    formData: FormData
  ) => Promise<AppointmentFormState>;
  appointment?: Appointment;
  collaborators: CollaboratorOption[];
  units: Unit[];
  macas: Maca[];
  currentUser: { id: string; role: UserRole };
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isAdmin = currentUser.role === "admin";

  const [collaboratorId, setCollaboratorId] = useState(
    appointment?.collaborator_id ?? currentUser.id
  );
  const [unitId, setUnitId] = useState(
    appointment?.unit_id ?? (units.length === 1 ? units[0].id : "")
  );
  const [macaId, setMacaId] = useState(appointment?.maca_id ?? "");

  const selectedRole = useMemo(
    () => collaborators.find((c) => c.id === collaboratorId)?.role,
    [collaborators, collaboratorId]
  );

  const showMaca = selectedRole === "tatuador";
  const macasInUnit = useMemo(
    () => macas.filter((m) => m.unit_id === unitId),
    [macas, unitId]
  );

  const defaultStart = appointment
    ? toLocalInputValue(appointment.starts_at)
    : `${defaultDate}T09:00`;
  const defaultEnd = appointment
    ? toLocalInputValue(appointment.ends_at)
    : `${defaultDate}T10:00`;

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-xl">
      {isAdmin ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Colaborador
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            required
            value={collaboratorId}
            onChange={(e) => setCollaboratorId(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"} — {ROLE_LABEL[c.role]}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="collaborator_id" value={currentUser.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="starts_at" className="text-sm text-neutral-300">
            Início
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ends_at" className="text-sm text-neutral-300">
            Fim
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={defaultEnd}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit_id" className="text-sm text-neutral-300">
          Unidade
        </label>
        <select
          id="unit_id"
          name="unit_id"
          required
          value={unitId}
          onChange={(e) => {
            setUnitId(e.target.value);
            setMacaId("");
          }}
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

      {showMaca && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maca_id" className="text-sm text-neutral-300">
            Maca
          </label>
          <select
            id="maca_id"
            name="maca_id"
            required
            value={macaId}
            onChange={(e) => setMacaId(e.target.value)}
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="client_name" className="text-sm text-neutral-300">
          Cliente
        </label>
        <input
          id="client_name"
          name="client_name"
          required
          defaultValue={appointment?.client_name}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_phone" className="text-sm text-neutral-300">
            Telefone (opcional)
          </label>
          <input
            id="client_phone"
            name="client_phone"
            defaultValue={appointment?.client_phone}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_birthday" className="text-sm text-neutral-300">
            Data de nascimento (opcional)
          </label>
          <input
            id="client_birthday"
            name="client_birthday"
            type="date"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-neutral-500">
        Telefone identifica o cliente pro cadastro e pras mensagens
        automáticas (aniversário, acompanhamento pós-tattoo).
      </p>

      <label className="flex items-start gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          name="client_is_own"
          defaultChecked={appointment?.client_is_own}
          className="mt-1"
        />
        Cliente próprio (fui eu quem trouxe) — afeta a comissão no Downtown
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm text-neutral-300">
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={appointment?.notes}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-neutral-800 p-4">
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
            defaultValue={appointment?.deposit_amount ?? 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deposit_status" className="text-sm text-neutral-300">
            Status do sinal
          </label>
          <select
            id="deposit_status"
            name="deposit_status"
            defaultValue={appointment?.deposit_status ?? "pendente"}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

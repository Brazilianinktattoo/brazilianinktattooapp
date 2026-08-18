"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAppointment, type AppointmentFormState } from "@/app/actions/agenda";

const initialState: AppointmentFormState = {};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function GuestAppointmentForm({
  collaboratorId,
  unitId,
  macaId,
  minDate,
  maxDate,
}: {
  collaboratorId: string;
  unitId: string;
  macaId: string;
  minDate: string;
  maxDate: string;
}) {
  const [state, formAction, pending] = useActionState(
    createAppointment,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <input type="hidden" name="collaborator_id" value={collaboratorId} />
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="maca_id" value={macaId} />
      <input type="hidden" name="deposit_amount" value="0" />
      <input type="hidden" name="deposit_status" value="pendente" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="starts_at" className="text-sm text-neutral-300">
            Início
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            min={toLocalInputValue(minDate)}
            max={toLocalInputValue(maxDate)}
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
            min={toLocalInputValue(minDate)}
            max={toLocalInputValue(maxDate)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="client_name" className="text-sm text-neutral-300">
          Cliente
        </label>
        <input
          id="client_name"
          name="client_name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="client_phone" className="text-sm text-neutral-300">
          Telefone (opcional)
        </label>
        <input
          id="client_phone"
          name="client_phone"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Agendando..." : "Agendar"}
      </button>
    </form>
  );
}

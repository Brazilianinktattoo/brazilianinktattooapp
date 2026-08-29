"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  addLobuloplastiaSession,
  addLobuloplastiaEvolutionNote,
  type LobuloplastiaEntryState,
} from "@/app/actions/lobuloplastia";

const initialState: LobuloplastiaEntryState = {};

export function AddSessionForm({
  formId,
  nextSessionNumber,
}: {
  formId: string;
  nextSessionNumber: number;
}) {
  const action = addLobuloplastiaSession.bind(null, formId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session_number" className="text-sm text-neutral-300">
          Sessão nº
        </label>
        <input
          id="session_number"
          name="session_number"
          type="number"
          min={1}
          defaultValue={nextSessionNumber}
          required
          className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="entry_date" className="text-sm text-neutral-300">
          Data
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 200 }}>
        <label htmlFor="session_description" className="text-sm text-neutral-300">
          Descrição
        </label>
        <input
          id="session_description"
          name="description"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Registrar sessão"}
      </button>
      {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddEvolutionForm({ formId }: { formId: string }) {
  const action = addLobuloplastiaEvolutionNote.bind(null, formId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="evolution_description" className="text-sm text-neutral-300">
          Nova nota de evolução
        </label>
        <textarea
          id="evolution_description"
          name="description"
          rows={2}
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Adicionar evolução"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

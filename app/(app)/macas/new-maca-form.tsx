"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMaca, type MacaFormState } from "@/app/actions/agenda";

const initialState: MacaFormState = {};

export function NewMacaForm() {
  const [state, formAction, pending] = useActionState(createMaca, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="label" className="text-sm text-neutral-300">
          Nova maca
        </label>
        <input
          id="label"
          name="label"
          required
          placeholder="Ex: Maca 4"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-red-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Adicionar"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

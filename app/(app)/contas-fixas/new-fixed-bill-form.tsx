"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFixedBill, type FixedBillFormState } from "@/app/actions/fixed-bills";

const initialState: FixedBillFormState = {};

export function NewFixedBillForm() {
  const [state, formAction, pending] = useActionState(createFixedBill, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-neutral-300">
          Tipo de conta
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex: Aluguel"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-sm text-neutral-300">
          Valor (R$)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="due_date" className="text-sm text-neutral-300">
          Vencimento
        </label>
        <input
          id="due_date"
          name="due_date"
          type="date"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="paid_date" className="text-sm text-neutral-300">
          Pagamento (opcional)
        </label>
        <input
          id="paid_date"
          name="paid_date"
          type="date"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>

      <div className="sm:col-span-4 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Adicionar conta"}
        </button>
      </div>
    </form>
  );
}

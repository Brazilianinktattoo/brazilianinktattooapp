"use client";

import { useActionState, useState } from "react";
import { addFeeRate, type AddFeeRateState } from "@/app/actions/fees";
import { INSTALLMENT_OPTIONS } from "@/lib/fees";

const initialState: AddFeeRateState = {};

export function AddFeeRateForm() {
  const [state, formAction, pending] = useActionState(addFeeRate, initialState);
  const [method, setMethod] = useState<"debito" | "credito">("credito");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div>
        <h2 className="font-semibold text-white">Cadastrar nova taxa</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Cadastrar aqui não apaga a taxa anterior — fica registrado o
          histórico de quando cada valor passou a valer.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="method" className="text-sm text-neutral-300">
            Modalidade
          </label>
          <select
            id="method"
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as "debito" | "credito")}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
          </select>
        </div>
        {method === "credito" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="installments" className="text-sm text-neutral-300">
              Parcelas
            </label>
            <select
              id="installments"
              name="installments"
              defaultValue={1}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            >
              {INSTALLMENT_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}x
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rate_percent" className="text-sm text-neutral-300">
            Taxa (%)
          </label>
          <input
            id="rate_percent"
            name="rate_percent"
            required
            placeholder="Ex: 4,00"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-green-400">Taxa cadastrada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Cadastrar taxa"}
      </button>
    </form>
  );
}

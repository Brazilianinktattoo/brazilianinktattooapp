"use client";

import { useActionState } from "react";
import {
  generateStudentAnamneseForm,
  type GenerateStudentAnamneseState,
} from "@/app/actions/student-anamnese";

const initialState: GenerateStudentAnamneseState = {};

export function StudentAnamneseGenerator() {
  const [state, formAction, pending] = useActionState(
    generateStudentAnamneseForm,
    initialState
  );

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/anamnese-piercing/${state.token}`
      : null;

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student_name" className="text-sm text-neutral-300">
            Aluno responsável
          </label>
          <input
            id="student_name"
            name="student_name"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="procedure_location" className="text-sm text-neutral-300">
            Local da tattoo/piercing
          </label>
          <input
            id="procedure_location"
            name="procedure_location"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="procedure_type" className="text-sm text-neutral-300">
            Tipo
          </label>
          <input
            id="procedure_type"
            name="procedure_type"
            placeholder="Tatuagem ou Piercing"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="value" className="text-sm text-neutral-300">
            Valor (R$)
          </label>
          <input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={0}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="notes" className="text-sm text-neutral-300">
            Observações (opcional)
          </label>
          <input
            id="notes"
            name="notes"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Gerando..." : "Gerar link"}
          </button>
        </div>
      </form>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {link && (
        <div className="rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">
            Link de preenchimento — envie para o cliente:
          </p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
          />
        </div>
      )}
    </div>
  );
}

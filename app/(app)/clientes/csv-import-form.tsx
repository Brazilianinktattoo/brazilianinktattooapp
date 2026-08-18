"use client";

import { useActionState, useEffect, useRef } from "react";
import { importClientsCsv, type ImportCsvState } from "@/app/actions/clients";

const initialState: ImportCsvState = {};

export function CsvImportForm() {
  const [state, formAction, pending] = useActionState(importClientsCsv, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.result) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div>
        <h3 className="font-medium text-white">Importar clientes de um CSV</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Exportado do seu CRM. O app reconhece colunas como Nome, Telefone,
          Aniversário e Observações (em português ou inglês, em qualquer
          ordem). O telefone identifica o cliente — se já existir um cadastro
          com o mesmo telefone, ele é atualizado em vez de duplicado.
        </p>
      </div>
      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border file:border-neutral-700 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-neutral-300 hover:file:border-neutral-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Importando..." : "Importar"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.result && (
        <div className="text-sm text-neutral-300">
          <p className="text-green-400">
            {state.result.created} criado(s), {state.result.updated} atualizado(s)
            {state.result.unchanged > 0 ? `, ${state.result.unchanged} sem alteração` : ""}
            {state.result.skipped > 0 ? `, ${state.result.skipped} ignorado(s)` : ""}.
          </p>
          {state.result.skippedDetails.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-neutral-500">
              {state.result.skippedDetails.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

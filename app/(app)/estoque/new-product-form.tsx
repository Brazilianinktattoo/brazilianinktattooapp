"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProduct, type ProductFormState } from "@/app/actions/estoque";

const initialState: ProductFormState = {};

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
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
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-neutral-300">
          Nome do produto
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-red-500"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm text-neutral-300">
          Código
        </label>
        <input
          id="code"
          name="code"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-red-500"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="min_stock" className="text-sm text-neutral-300">
          Estoque mínimo
        </label>
        <input
          id="min_stock"
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-red-500"
        />
      </div>

      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

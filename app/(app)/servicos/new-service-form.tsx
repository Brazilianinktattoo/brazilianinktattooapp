"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createService, type ServiceFormState } from "@/app/actions/services";

const initialState: ServiceFormState = {};

const SUBCATEGORY_OPTIONS = [
  { value: "", label: "Sem subcategoria" },
  { value: "so_perfuracao", label: "Só perfuração" },
  { value: "perfuracao_joia", label: "Perfuração + joia" },
  { value: "joia_titanio", label: "Joias avulsas — Titânio" },
  { value: "joia_aco", label: "Joias avulsas — Aço Cirúrgico" },
];

export function NewServiceForm({
  restrictToPiercing = false,
}: {
  restrictToPiercing?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createService, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState(restrictToPiercing ? "piercing" : "tatuagem");
  const isPiercing = restrictToPiercing || category === "piercing";

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
          Nome do serviço
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex: Fechamento de braço"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="price" className="text-sm text-neutral-300">
          Preço (R$)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      {restrictToPiercing ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-neutral-300">Categoria</span>
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-400">
            Piercing
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm text-neutral-300">
            Categoria
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="tatuagem">Tatuagem</option>
            <option value="piercing">Piercing</option>
          </select>
        </div>
      )}

      {isPiercing && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="subcategory" className="text-sm text-neutral-300">
            Subcategoria
          </label>
          <select
            id="subcategory"
            name="subcategory"
            defaultValue=""
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            {SUBCATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Cadastrar serviço"}
        </button>
      </div>
    </form>
  );
}

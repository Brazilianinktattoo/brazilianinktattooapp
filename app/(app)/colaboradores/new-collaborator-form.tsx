"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  createCollaborator,
  type CreateCollaboratorState,
} from "@/app/actions/collaborators";

const initialState: CreateCollaboratorState = {};

const ROLE_OPTIONS = [
  { value: "tatuador", label: "Tatuador(a)" },
  { value: "piercer", label: "Body Piercer" },
  { value: "chefe_piercing", label: "Chefe de Piercing" },
  { value: "admin", label: "Admin" },
];

export function NewCollaboratorForm({
  restrictToPiercer = false,
}: {
  restrictToPiercer?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createCollaborator,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm text-neutral-300">
          Nome completo
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-neutral-300">
          E-mail (login)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-neutral-300">
          Senha provisória
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      {restrictToPiercer ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-neutral-300">Nível de acesso</span>
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-400">
            Body Piercer
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm text-neutral-300">
            Nível de acesso
          </label>
          <select
            id="role"
            name="role"
            defaultValue="tatuador"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <div className="text-sm">
          {state.error && <p className="text-red-400">{state.error}</p>}
          {state.success && (
            <p className="text-green-400">Colaborador criado com sucesso.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar colaborador"}
        </button>
      </div>
    </form>
  );
}

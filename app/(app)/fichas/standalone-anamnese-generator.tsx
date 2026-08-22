"use client";

import { useActionState } from "react";
import {
  createStandaloneAnamneseLink,
  type CreateStandaloneAnamneseState,
} from "@/app/actions/coworking-anamnese";

const initialState: CreateStandaloneAnamneseState = {};

export function StandaloneAnamneseGenerator() {
  const [state, formAction, pending] = useActionState(
    createStandaloneAnamneseLink,
    initialState
  );

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/anamnese-coworking/${state.token}`
      : null;

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="language" className="text-sm text-neutral-300">
            Idioma
          </label>
          <select
            id="language"
            name="language"
            defaultValue="ingles"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            <option value="ingles">Inglês</option>
            <option value="espanhol">Espanhol</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 180 }}>
          <label htmlFor="full_name" className="text-sm text-neutral-300">
            Cliente (opcional)
          </label>
          <input
            id="full_name"
            name="full_name"
            placeholder="Só pra identificar o link"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar link"}
        </button>
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

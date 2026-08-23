"use client";

import { useActionState } from "react";
import {
  createExceptionPass,
  type CreateExceptionPassState,
} from "@/app/actions/exception-passes";
import type { Profile } from "@/lib/types/database";

const initialState: CreateExceptionPassState = {};

export function CreatePassForm({
  collaborators,
}: {
  collaborators: Pick<Profile, "id" | "full_name" | "role">[];
}) {
  const [state, formAction, pending] = useActionState(
    createExceptionPass,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <h2 className="font-medium text-white">Nova liberação</h2>

      <div className="flex flex-wrap gap-3">
        <select
          name="collaborator_id"
          required
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        >
          <option value="">Selecione o tatuador...</option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>

        <select
          name="duration"
          required
          defaultValue="2"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        >
          <option value="1">1 hora</option>
          <option value="2">2 horas</option>
          <option value="4">4 horas</option>
          <option value="resto_do_dia">Resto do dia</option>
        </select>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Liberando..." : "Liberar"}
        </button>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-400">Liberação criada com sucesso.</p>
      )}
    </form>
  );
}

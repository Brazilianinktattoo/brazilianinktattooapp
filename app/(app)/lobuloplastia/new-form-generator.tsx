"use client";

import { useActionState, useEffect, useState } from "react";
import {
  generateLobuloplastiaLink,
  type GenerateLobuloplastiaState,
} from "@/app/actions/lobuloplastia";

const initialState: GenerateLobuloplastiaState = {};

type CollaboratorOption = { id: string; full_name: string };

export function NewFormGenerator({
  collaborators,
  currentUserId,
}: {
  collaborators: CollaboratorOption[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    generateLobuloplastiaLink,
    initialState
  );
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (state.success && state.token && typeof window !== "undefined") {
      setLink(`${window.location.origin}/lobuloplastia/${state.token}`);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper"
      >
        + Gerar ficha de Lobuloplastia
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm text-neutral-300">
            Nome do cliente
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm text-neutral-300">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            required
            placeholder="Ex: 11 95550-1001"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Profissional responsável
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            defaultValue={currentUserId}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar link"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-400 hover:text-white"
        >
          Fechar
        </button>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {link && (
        <div className="rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">Link gerado! Envie pro cliente:</p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
          />
        </div>
      )}
    </form>
  );
}

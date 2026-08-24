"use client";

import { useActionState } from "react";
import {
  createWhatsAppTemplates,
  type CreateTemplatesState,
} from "@/app/actions/whatsapp-setup";

const initialState: CreateTemplatesState = {};

export function CreateTemplatesForm() {
  const [state, formAction, pending] = useActionState(
    createWhatsAppTemplates,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Criar e enviar os 8 modelos pra aprovação"}
      </button>

      {state.results && (
        <ul className="flex flex-col gap-1 text-sm">
          {state.results.map((r) => (
            <li
              key={r.name}
              className={r.ok ? "text-green-400" : "text-red-400"}
            >
              {r.ok ? "✓" : "✗"} {r.name} — {r.detail}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { generateSignupLink, type SignupLinkState } from "@/app/actions/cursos";

const initialState: SignupLinkState = {};

export function GenerateLinkForm({ courseClassId }: { courseClassId: string }) {
  const [state, formAction, pending] = useActionState(generateSignupLink, initialState);

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/cursos/inscricao/${state.token}`
      : null;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <input type="hidden" name="course_class_id" value={courseClassId} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          Gere um link único e envie para o lead preencher a ficha de
          inscrição.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar link de inscrição"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {link && (
        <div className="rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">Link gerado! Envie para o lead:</p>
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

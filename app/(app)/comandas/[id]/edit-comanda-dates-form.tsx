"use client";

import { useState } from "react";
import { updateComandaDates } from "@/app/actions/comandas";
import { toStudioLocalInputValue } from "@/lib/date";

export function EditComandaDatesForm({
  comandaId,
  createdAt,
  closedAt,
}: {
  comandaId: string;
  createdAt: string;
  closedAt: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setSuccess(false);
        const formData = new FormData(e.currentTarget);
        const result = await updateComandaDates(comandaId, formData);
        setPending(false);
        if (result.error) setError(result.error);
        else setSuccess(true);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="created_at" className="text-sm text-neutral-300">
          Data/hora de abertura
        </label>
        <input
          id="created_at"
          name="created_at"
          type="datetime-local"
          required
          defaultValue={toStudioLocalInputValue(createdAt)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="closed_at" className="text-sm text-neutral-300">
          Data/hora de fechamento
        </label>
        <input
          id="closed_at"
          name="closed_at"
          type="datetime-local"
          defaultValue={closedAt ? toStudioLocalInputValue(closedAt) : ""}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Salvando..." : "Salvar datas"}
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
      {success && <p className="w-full text-xs text-green-400">Datas atualizadas.</p>}
    </form>
  );
}

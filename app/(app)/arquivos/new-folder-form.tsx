"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createDocumentFolder, type FolderFormState } from "@/app/actions/documents";

const initialState: FolderFormState = {};

export function NewFolderForm({ parentId }: { parentId: string | null }) {
  const [open, setOpen] = useState(false);
  const createAction = createDocumentFolder.bind(null, parentId);
  const [state, formAction, pending] = useActionState(createAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (!state.error) setOpen(false);
  }

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
      >
        + Nova subpasta
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <div className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 200 }}>
        <label htmlFor="folder_name" className="text-sm text-neutral-300">
          Nome da pasta
        </label>
        <input
          id="folder_name"
          name="name"
          required
          autoFocus
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-neutral-400 hover:text-white"
      >
        Cancelar
      </button>
      {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

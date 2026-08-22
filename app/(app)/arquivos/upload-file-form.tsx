"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadDocumentFile, type UploadFileState } from "@/app/actions/documents";

const initialState: UploadFileState = {};

export function UploadFileForm({ folderId }: { folderId: string }) {
  const uploadAction = uploadDocumentFile.bind(null, folderId);
  const [state, formAction, pending] = useActionState(uploadAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <div className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 220 }}>
        <label htmlFor="file" className="text-sm text-neutral-300">
          Enviar arquivo/foto (máx. 25MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
        />
      </div>
      <div className="flex flex-col gap-1.5" style={{ minWidth: 180 }}>
        <label htmlFor="doc_name" className="text-sm text-neutral-300">
          Nome (opcional)
        </label>
        <input
          id="doc_name"
          name="name"
          placeholder="Usa o nome do arquivo"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar"}
      </button>
      {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

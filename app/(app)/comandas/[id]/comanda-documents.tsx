"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  uploadComandaDocument,
  deleteComandaDocument,
  getComandaDocumentUrl,
  type UploadComandaDocumentState,
} from "@/app/actions/comandas";
import type { ComandaDocument } from "@/lib/types/database";

const initialState: UploadComandaDocumentState = {};

function ViewDocumentButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const url = await getComandaDocumentUrl(filePath);
        setLoading(false);
        if (url) window.open(url, "_blank");
      }}
      className="text-gold hover:underline disabled:opacity-60"
    >
      {loading ? "Abrindo..." : "Ver"}
    </button>
  );
}

export function ComandaDocuments({
  comandaId,
  documents,
  canEdit,
}: {
  comandaId: string;
  documents: ComandaDocument[];
  canEdit: boolean;
}) {
  const uploadAction = uploadComandaDocument.bind(null, comandaId);
  const [state, formAction, pending] = useActionState(uploadAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div>
        <h2 className="font-semibold text-white">Ficha de anamnese em papel</h2>
        <p className="text-sm text-neutral-500">
          Anexe o PDF ou a foto da ficha assinada fisicamente pelo cliente.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum arquivo anexado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm"
            >
              <span className="truncate text-neutral-200">{d.file_name}</span>
              <div className="flex shrink-0 items-center gap-3">
                <ViewDocumentButton filePath={d.file_path} />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteComandaDocument(comandaId, d.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-3"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="file" className="text-sm text-neutral-300">
              Arquivo (PDF, JPEG ou PNG — máx. 15MB)
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              required
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Enviando..." : "Anexar"}
          </button>
          {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
        </form>
      )}
    </div>
  );
}

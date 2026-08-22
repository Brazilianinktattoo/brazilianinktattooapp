"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  getDocumentFileUrl,
  renameDocumentFile,
  replaceDocumentFile,
  deleteDocumentFile,
  type UploadFileState,
} from "@/app/actions/documents";
import type { DocumentFile } from "@/lib/types/database";

const initialReplaceState: UploadFileState = {};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function FileRow({ file }: { file: DocumentFile }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(file.name);
  const [opening, setOpening] = useState(false);
  const [pending, startTransition] = useTransition();
  const replaceAction = replaceDocumentFile.bind(null, file.id);
  const [replaceState, replaceFormAction, replacePending] = useActionState(
    replaceAction,
    initialReplaceState
  );
  const replaceFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!replaceState.error) replaceFormRef.current?.reset();
  }, [replaceState]);

  return (
    <tr className="border-b border-neutral-800 align-top">
      <td className="py-3 pl-4 pr-4">
        {renaming ? (
          <input
            value={name}
            disabled={pending}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (name.trim() && name !== file.name) {
                startTransition(() => renameDocumentFile(file.id, name));
              }
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
          />
        ) : (
          <span className="text-neutral-100">📄 {file.name}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-neutral-400">{formatSize(file.size_bytes)}</td>
      <td className="py-3 pr-4 text-neutral-400">{formatDate(file.created_at)}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            disabled={opening}
            onClick={async () => {
              setOpening(true);
              const url = await getDocumentFileUrl(file.id);
              setOpening(false);
              if (url) window.open(url, "_blank");
            }}
            className="text-neutral-300 hover:text-gold disabled:opacity-60"
          >
            {opening ? "Abrindo..." : "Ver"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRenaming(true)}
            className="text-neutral-300 hover:text-gold disabled:opacity-60"
          >
            Renomear
          </button>
          <details className="text-neutral-300">
            <summary className="cursor-pointer hover:text-gold">Trocar arquivo</summary>
            <form
              ref={replaceFormRef}
              action={replaceFormAction}
              className="mt-2 flex flex-col gap-2"
            >
              <input
                type="file"
                name="file"
                required
                className="text-neutral-300 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-neutral-200"
              />
              <button
                type="submit"
                disabled={replacePending}
                className="self-start rounded-lg border border-neutral-700 px-3 py-1 text-neutral-200 hover:border-gold-soft hover:text-gold disabled:opacity-60"
              >
                {replacePending ? "Enviando..." : "Salvar"}
              </button>
              {replaceState.error && (
                <p className="text-red-400">{replaceState.error}</p>
              )}
            </form>
          </details>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Excluir "${file.name}"?`)) return;
              startTransition(() => deleteDocumentFile(file.id));
            }}
            className="text-neutral-300 hover:text-red-400 disabled:opacity-60"
          >
            Excluir
          </button>
        </div>
      </td>
    </tr>
  );
}

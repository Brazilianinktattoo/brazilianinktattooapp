"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { renameDocumentFolder, deleteDocumentFolder } from "@/app/actions/documents";
import type { DocumentFolder } from "@/lib/types/database";

export function FolderRow({ folder }: { folder: DocumentFolder }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      {renaming ? (
        <input
          value={name}
          disabled={pending}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setRenaming(false);
            if (name.trim() && name !== folder.name) {
              startTransition(() => renameDocumentFolder(folder.id, name));
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
      ) : (
        <Link
          href={`/arquivos?folderId=${folder.id}`}
          className="flex items-center gap-2 font-medium text-neutral-100 hover:text-gold"
        >
          📁 {folder.name}
        </Link>
      )}

      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <button
          type="button"
          disabled={pending}
          onClick={() => setRenaming(true)}
          className="hover:text-gold disabled:opacity-60"
        >
          Renomear
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Excluir a pasta "${folder.name}"?`)) return;
            setError(null);
            startTransition(async () => {
              const result = await deleteDocumentFolder(folder.id);
              if (result.error) setError(result.error);
            });
          }}
          className="hover:text-red-400 disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateFormText } from "@/app/actions/form-texts";
import type { FormText } from "@/lib/types/database";

export function FormTextEditor({ text }: { text: FormText }) {
  const [body, setBody] = useState(text.body);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const dirty = body !== text.body;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h3 className="font-medium text-white">{text.label}</h3>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        rows={4}
        className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            startTransition(async () => {
              await updateFormText(text.key, body);
              setSaved(true);
            })
          }
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {saved && !dirty && <span className="text-sm text-green-400">Salvo.</span>}
      </div>
    </div>
  );
}

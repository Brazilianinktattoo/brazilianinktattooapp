"use client";

import { useTransition } from "react";
import { generateDueMessagesNow } from "@/app/actions/mensagens";

export function GenerateNowButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => generateDueMessagesNow())}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-60"
    >
      {pending ? "Gerando..." : "Gerar mensagens de hoje agora"}
    </button>
  );
}

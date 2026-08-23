"use client";

import { useTransition } from "react";
import { revokeExceptionPass } from "@/app/actions/exception-passes";

export function RevokePassButton({ passId }: { passId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Revogar essa liberação agora?")) return;
        startTransition(() => revokeExceptionPass(passId));
      }}
      className="text-xs text-neutral-300 hover:text-red-400 disabled:opacity-60"
    >
      Revogar
    </button>
  );
}

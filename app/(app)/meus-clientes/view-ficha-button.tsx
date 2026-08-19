"use client";

import { useState } from "react";
import { getAnamnesePdfUrl } from "@/app/actions/anamnese";

export function ViewFichaButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const url = await getAnamnesePdfUrl(filePath);
        setLoading(false);
        if (url) window.open(url, "_blank");
      }}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:border-gold-soft hover:text-gold disabled:opacity-60"
    >
      {loading ? "Abrindo..." : "Ver ficha"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateUnitHours } from "@/app/actions/agenda";

function toHHMM(time: string) {
  return time.slice(0, 5);
}

export function UnitHoursEditor({
  unitId,
  opensAt,
  closesAt,
}: {
  unitId: string;
  opensAt: string;
  closesAt: string;
}) {
  const [opens, setOpens] = useState(toHHMM(opensAt));
  const [closes, setCloses] = useState(toHHMM(closesAt));
  const [pending, startTransition] = useTransition();

  function save(nextOpens: string, nextCloses: string) {
    if (nextOpens >= nextCloses) return;
    startTransition(() => updateUnitHours(unitId, nextOpens, nextCloses));
  }

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <span>Funcionamento:</span>
      <input
        type="time"
        value={opens}
        disabled={pending}
        onChange={(e) => setOpens(e.target.value)}
        onBlur={() => {
          if (opens !== toHHMM(opensAt)) save(opens, closes);
        }}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
      />
      <span>às</span>
      <input
        type="time"
        value={closes}
        disabled={pending}
        onChange={(e) => setCloses(e.target.value)}
        onBlur={() => {
          if (closes !== toHHMM(closesAt)) save(opens, closes);
        }}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
      />
      <span className="text-xs text-neutral-500">(seg-sáb — domingo é sempre fechado)</span>
    </div>
  );
}

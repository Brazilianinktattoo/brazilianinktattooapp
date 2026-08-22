"use client";

import { useState, useTransition } from "react";
import {
  updateCollaboratorCommissionRate,
  updateCollaboratorSalesCommissionRate,
} from "@/app/actions/collaborators";
import type { Profile } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
};

function percentString(rate: number | null): string {
  return rate !== null ? String(Math.round(rate * 100)) : "";
}

function RateInput({
  initialPercent,
  onSave,
}: {
  initialPercent: string;
  onSave: (percent: string) => void;
}) {
  const [percent, setPercent] = useState(initialPercent);
  const [pending, startTransition] = useTransition();

  function save(next: string) {
    startTransition(() => onSave(next));
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={pending}
        placeholder="—"
        onChange={(e) => setPercent(e.target.value)}
        onBlur={(e) => {
          if (e.target.value !== initialPercent) save(e.target.value);
        }}
        className="w-20 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
      />
      <span className="text-sm text-neutral-500">%</span>
      {percent !== "" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPercent("");
            save("");
          }}
          className="text-xs text-neutral-500 hover:text-gold disabled:opacity-60"
        >
          Automático
        </button>
      )}
    </div>
  );
}

export function ComissaoRow({ profile }: { profile: Profile }) {
  const isPiercingRole = profile.role === "piercer" || profile.role === "chefe_piercing";

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-3 pl-4 pr-4 text-neutral-100">
        {profile.full_name || "Sem nome"}
      </td>
      <td className="py-3 pr-4 text-neutral-400">
        {ROLE_LABEL[profile.role] ?? profile.role}
      </td>
      <td className="py-3 pr-4">
        <RateInput
          initialPercent={percentString(profile.commission_rate)}
          onSave={(percent) =>
            updateCollaboratorCommissionRate(
              profile.id,
              percent.trim() === "" ? null : Number(percent)
            )
          }
        />
        <p className="mt-1 text-xs text-neutral-500">
          {profile.commission_rate !== null
            ? "Taxa fixa"
            : "Automático (50% Barra Shopping; 70%/50% Downtown)"}
        </p>
      </td>
      <td className="py-3 pr-4">
        {isPiercingRole ? (
          <>
            <RateInput
              initialPercent={percentString(profile.commission_rate_sales)}
              onSave={(percent) =>
                updateCollaboratorSalesCommissionRate(
                  profile.id,
                  percent.trim() === "" ? null : Number(percent)
                )
              }
            />
            <p className="mt-1 text-xs text-neutral-500">
              {profile.commission_rate_sales !== null ? "Taxa fixa" : "Sem comissão"}
            </p>
          </>
        ) : (
          <span className="text-sm text-neutral-600">—</span>
        )}
      </td>
    </tr>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateClientBirthday } from "@/app/actions/clients";
import type { Client } from "@/lib/types/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ClientRow({
  client,
  lastVisit,
  registrarName,
}: {
  client: Client;
  lastVisit: string | null;
  registrarName?: string | null;
}) {
  const [birthday, setBirthday] = useState(client.birthday ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-800">
      <td className="py-3 pl-4 pr-4 text-neutral-100">{client.full_name}</td>
      <td className="py-3 pr-4 text-neutral-300">{client.phone}</td>
      <td className="py-3 pr-4">
        <input
          type="date"
          value={birthday}
          disabled={pending}
          onChange={(e) => setBirthday(e.target.value)}
          onBlur={() => {
            if (birthday !== (client.birthday ?? "")) {
              startTransition(() => updateClientBirthday(client.id, birthday));
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4 text-neutral-300">
        {lastVisit ? formatDate(lastVisit) : "—"}
      </td>
      <td className="py-3 pr-4 text-neutral-300">{registrarName || "—"}</td>
    </tr>
  );
}

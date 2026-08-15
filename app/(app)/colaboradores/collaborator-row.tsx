"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateCollaboratorRole,
  setCollaboratorActive,
  resetCollaboratorPassword,
  type ResetPasswordState,
} from "@/app/actions/collaborators";
import type { Profile, UserRole } from "@/lib/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "tatuador", label: "Tatuador(a)" },
  { value: "piercer", label: "Body Piercer" },
  { value: "admin", label: "Admin" },
];

const initialResetState: ResetPasswordState = {};

export function CollaboratorRow({
  profile,
  isSelf,
}: {
  profile: Profile;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(profile.role);
  const [active, setActive] = useState(profile.active);
  const [pending, startTransition] = useTransition();
  const [resetState, resetAction, resetPending] = useActionState(
    resetCollaboratorPassword,
    initialResetState
  );

  return (
    <tr className="border-b border-neutral-800 align-top">
      <td className="py-3 pr-4 pl-4">
        <div className="text-neutral-100">{profile.full_name || "—"}</div>
        <div className="text-xs text-neutral-500">{profile.email}</div>
      </td>

      <td className="py-3 pr-4">
        <select
          value={role}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as UserRole;
            setRole(next);
            startTransition(() => updateCollaboratorRole(profile.id, next));
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-red-500 disabled:opacity-60"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={pending || isSelf}
          title={isSelf ? "Você não pode desativar seu próprio acesso" : ""}
          onClick={() => {
            const next = !active;
            setActive(next);
            startTransition(() => setCollaboratorActive(profile.id, next));
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            active
              ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
              : "bg-neutral-700/40 text-neutral-400 hover:bg-neutral-700/60"
          }`}
        >
          {active ? "Ativo" : "Desativado"}
        </button>
      </td>

      <td className="py-3">
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-400 hover:text-white">
            Trocar senha
          </summary>
          <form
            action={resetAction}
            className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="id" value={profile.id} />
            <input
              type="password"
              name="password"
              minLength={6}
              placeholder="Nova senha"
              required
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={resetPending}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-white disabled:opacity-60"
            >
              {resetPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
          {resetState.error && (
            <p className="mt-1 text-xs text-red-400">{resetState.error}</p>
          )}
          {resetState.success && (
            <p className="mt-1 text-xs text-green-400">Senha atualizada.</p>
          )}
        </details>
      </td>
    </tr>
  );
}

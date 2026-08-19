"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateCollaboratorRole,
  updateCollaboratorName,
  updateCollaboratorEmail,
  updateCollaboratorBirthday,
  setCollaboratorActive,
  resetCollaboratorPassword,
  deleteCollaborator,
  setQrAnamneseEnabled,
  type ResetPasswordState,
  type UpdateEmailState,
} from "@/app/actions/collaborators";
import type { Profile, UserRole } from "@/lib/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "tatuador", label: "Tatuador(a)" },
  { value: "piercer", label: "Body Piercer" },
  { value: "chefe_piercing", label: "Chefe de Piercing" },
  { value: "admin", label: "Admin" },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
};

const initialResetState: ResetPasswordState = {};
const initialEmailState: UpdateEmailState = {};

export function CollaboratorRow({
  profile,
  isSelf,
  canChangeRole = true,
}: {
  profile: Profile;
  isSelf: boolean;
  canChangeRole?: boolean;
}) {
  const [role, setRole] = useState(profile.role);
  const [active, setActive] = useState(profile.active);
  const [fullName, setFullName] = useState(profile.full_name);
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [qrEnabled, setQrEnabled] = useState(profile.qr_anamnese_enabled);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetState, resetAction, resetPending] = useActionState(
    resetCollaboratorPassword,
    initialResetState
  );
  const updateEmailAction = updateCollaboratorEmail.bind(null, profile.id);
  const [emailState, emailAction, emailPending] = useActionState(
    updateEmailAction,
    initialEmailState
  );

  return (
    <tr className="border-b border-neutral-800 align-top">
      <td className="py-3 pr-4 pl-4">
        <input
          value={fullName}
          disabled={pending}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => {
            if (fullName.trim() && fullName !== profile.full_name) {
              startTransition(() =>
                updateCollaboratorName(profile.id, fullName)
              );
            }
          }}
          placeholder="Sem nome"
          className="w-40 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-neutral-100 outline-none hover:border-neutral-700 focus:border-gold focus:bg-neutral-900 disabled:opacity-60"
        />
        <div className="text-xs text-neutral-500">{profile.email}</div>
        <input
          type="date"
          value={birthday}
          disabled={pending}
          title="Aniversário"
          onChange={(e) => setBirthday(e.target.value)}
          onBlur={() => {
            if (birthday !== (profile.birthday ?? "")) {
              startTransition(() => updateCollaboratorBirthday(profile.id, birthday));
            }
          }}
          className="mt-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
        />
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-neutral-500 hover:text-white">
            Trocar e-mail
          </summary>
          <form
            action={emailAction}
            className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              name="email"
              defaultValue={profile.email}
              required
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={emailPending}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-60"
            >
              {emailPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
          {emailState.error && (
            <p className="mt-1 text-red-400">{emailState.error}</p>
          )}
          {emailState.success && (
            <p className="mt-1 text-green-400">E-mail atualizado.</p>
          )}
        </details>
      </td>

      <td className="py-3 pr-4">
        {canChangeRole ? (
          <select
            value={role}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as UserRole;
              setRole(next);
              startTransition(() => updateCollaboratorRole(profile.id, next));
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-neutral-400">
            {ROLE_LABEL[role] ?? role}
          </span>
        )}
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
        {canChangeRole &&
          (profile.role === "tatuador" ||
            profile.role === "piercer" ||
            profile.role === "chefe_piercing") && (
          <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={qrEnabled}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.checked;
                setQrEnabled(next);
                startTransition(() => setQrAnamneseEnabled(profile.id, next));
              }}
            />
            Na ficha por QR Code
          </label>
        )}
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
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={resetPending}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-60"
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

      {canChangeRole && (
        <td className="py-3 pr-4">
          {(profile.role === "tatuador" || profile.role === "piercer") && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      `Excluir definitivamente ${profile.full_name || "esse colaborador"}? Essa ação não pode ser desfeita.`
                    )
                  ) {
                    return;
                  }
                  setDeleteError(null);
                  startTransition(async () => {
                    const result = await deleteCollaborator(profile.id);
                    if (result.error) setDeleteError(result.error);
                  });
                }}
                className="text-sm text-neutral-500 hover:text-red-400 disabled:opacity-60"
              >
                Excluir
              </button>
              {deleteError && (
                <p className="mt-1 max-w-[160px] text-xs text-red-400">{deleteError}</p>
              )}
            </>
          )}
        </td>
      )}
    </tr>
  );
}

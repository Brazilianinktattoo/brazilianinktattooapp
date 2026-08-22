"use client";

import { useActionState, useState } from "react";
import {
  generateAutoContract,
  getContractFileUrl,
  type GenerateContractState,
} from "@/app/actions/cursos";
import { STUDIO_TZ } from "@/lib/date";
import type { CourseContract, CourseEnrollment } from "@/lib/types/database";

const initialState: GenerateContractState = {};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

export function AutoContractCard({
  enrollment,
  contract,
}: {
  enrollment: CourseEnrollment;
  contract: CourseContract | null;
}) {
  const [state, formAction, pending] = useActionState(generateAutoContract, initialState);
  const [fileUrlLoading, setFileUrlLoading] = useState(false);

  const missingData = !enrollment.rg || !enrollment.cpf || !enrollment.address || !enrollment.state;

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/cursos/contrato/${state.token}`
      : contract && !contract.signed && typeof window !== "undefined"
        ? `${window.location.origin}/cursos/contrato/${contract.sign_token}`
        : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">{enrollment.full_name}</div>
          <div className="text-sm text-neutral-400">{enrollment.email}</div>
        </div>
        {contract?.signed ? (
          <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
            Assinado em {contract.signed_at ? formatDateTime(contract.signed_at) : "—"}
          </span>
        ) : contract ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
            Aguardando assinatura
          </span>
        ) : (
          <span className="rounded-full bg-neutral-700/40 px-2.5 py-1 text-xs font-medium text-neutral-400">
            Contrato não gerado
          </span>
        )}
      </div>

      {missingData && (
        <p className="mt-3 text-sm text-amber-300">
          Faltam dados da ficha de inscrição (RG, CPF, endereço ou estado) — o
          contrato sai com campos em branco até completar.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-800 pt-4">
        {!contract?.signed && (
          <form action={formAction}>
            <input type="hidden" name="enrollment_id" value={enrollment.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Gerando..." : contract ? "Gerar novamente" : "Gerar contrato"}
            </button>
          </form>
        )}
        {contract?.file_path && (
          <button
            type="button"
            disabled={fileUrlLoading}
            onClick={async () => {
              setFileUrlLoading(true);
              const url = await getContractFileUrl(contract.file_path!);
              setFileUrlLoading(false);
              if (url) window.open(url, "_blank");
            }}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-60"
          >
            {fileUrlLoading ? "Abrindo..." : "Ver PDF"}
          </button>
        )}
      </div>

      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}

      {link && (
        <div className="mt-3 rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">Link de assinatura — envie para o aluno:</p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
          />
        </div>
      )}
    </div>
  );
}

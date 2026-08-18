"use client";

import { useActionState, useState } from "react";
import {
  getContractFileUrl,
  saveContractText,
  uploadContractFile,
  type ContractUploadState,
} from "@/app/actions/cursos";
import { contractTemplate } from "@/lib/cursos";
import type { CourseContract, CourseEnrollment } from "@/lib/types/database";

const initialUploadState: ContractUploadState = {};

export function ContractCard({
  enrollment,
  contract,
  courseLabel,
  className,
  priceTotal,
  depositPercentage,
}: {
  enrollment: CourseEnrollment;
  contract: CourseContract | null;
  courseLabel: string;
  className: string;
  priceTotal: number;
  depositPercentage: number;
}) {
  const [content, setContent] = useState(
    contract?.content ||
      contractTemplate({
        studentName: enrollment.full_name,
        studentCpf: enrollment.cpf,
        courseLabel,
        className,
        priceTotal,
        depositPercentage,
      })
  );
  const [savingText, setSavingText] = useState(false);
  const [savedText, setSavedText] = useState(false);
  const [fileUrlLoading, setFileUrlLoading] = useState(false);

  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadContractFile,
    initialUploadState
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">{enrollment.full_name}</div>
          <div className="text-sm text-neutral-400">{enrollment.email}</div>
        </div>
        {contract?.signed && (
          <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
            Contrato assinado anexado
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Texto do contrato (gerar/editar)</label>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSavedText(false);
          }}
          rows={10}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 outline-none focus:border-gold"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={savingText}
            onClick={async () => {
              setSavingText(true);
              await saveContractText(enrollment.id, content);
              setSavingText(false);
              setSavedText(true);
            }}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingText ? "Salvando..." : "Salvar texto"}
          </button>
          {savedText && <span className="text-sm text-green-400">Salvo.</span>}
        </div>
      </div>

      <form
        action={uploadAction}
        className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-800 pt-4"
      >
        <input type="hidden" name="enrollment_id" value={enrollment.id} />
        <input
          type="file"
          name="file"
          accept="application/pdf,image/*"
          required
          className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
        />
        <button
          type="submit"
          disabled={uploadPending}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-60"
        >
          {uploadPending ? "Enviando..." : "Anexar contrato assinado"}
        </button>
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
            className="text-sm text-neutral-400 hover:text-white disabled:opacity-60"
          >
            {fileUrlLoading ? "Abrindo..." : "Ver arquivo anexado"}
          </button>
        )}
      </form>
      {uploadState.error && <p className="mt-2 text-sm text-red-400">{uploadState.error}</p>}
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminOrPiercingStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LobuloplastiaEntry, LobuloplastiaForm } from "@/lib/types/database";
import { ViewPdfButton } from "./view-pdf-button";
import { SendAftercareButton } from "./send-aftercare-button";
import { AddSessionForm, AddEvolutionForm } from "./add-entry-forms";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LobuloplastiaDetailPage(
  props: PageProps<"/lobuloplastia/ficha/[id]">
) {
  const { id } = await props.params;
  await requireAdminOrPiercingStaff();

  const supabase = await createClient();

  const [{ data: form }, { data: entries }] = await Promise.all([
    supabase
      .from("lobuloplastia_forms")
      .select("*")
      .eq("id", id)
      .maybeSingle<LobuloplastiaForm>(),
    supabase
      .from("lobuloplastia_entries")
      .select("*")
      .eq("form_id", id)
      .order("created_at", { ascending: false })
      .returns<LobuloplastiaEntry[]>(),
  ]);

  if (!form) notFound();

  const list = entries ?? [];
  const sessionNumbers = list
    .filter((e) => e.kind === "sessao" && e.session_number)
    .map((e) => e.session_number as number);
  const nextSessionNumber = sessionNumbers.length > 0 ? Math.max(...sessionNumbers) + 1 : 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/lobuloplastia" className="text-sm text-neutral-500 hover:text-white">
          ← Lobuloplastia
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">{form.full_name}</h1>
        <p className="text-neutral-400">{form.phone}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            form.signed_at
              ? "bg-green-500/15 text-green-400"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {form.signed_at ? `Assinada em ${formatDateTime(form.signed_at)}` : "Aguardando assinatura"}
        </span>
        {form.file_path && <ViewPdfButton filePath={form.file_path} />}
        {form.signed_at && <SendAftercareButton formId={form.id} />}
      </div>

      {!form.signed_at && (
        <div className="rounded-xl border border-amber-800 bg-amber-500/10 p-4 text-sm text-amber-300">
          O cliente ainda não assinou. Envie o link de novo se precisar —
          está em <span className="font-mono">/lobuloplastia/{form.sign_token}</span>.
        </div>
      )}

      {form.fenda_description && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="mb-1 font-semibold text-white">Descrição e localização da fenda</h2>
          <p className="text-sm text-neutral-300">{form.fenda_description}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Sessões</h2>
        <AddSessionForm formId={form.id} nextSessionNumber={nextSessionNumber} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Evolução do procedimento</h2>
        <AddEvolutionForm formId={form.id} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-white">Histórico</h2>
        {list.length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-500">
            Nenhuma sessão ou evolução registrada ainda.
          </p>
        )}
        {list.map((e) => (
          <div
            key={e.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm"
          >
            {e.kind === "sessao" ? (
              <>
                <span className="font-medium text-white">
                  Sessão {e.session_number} — {formatDate(e.entry_date)}
                </span>
                {e.description && <p className="mt-1 text-neutral-300">{e.description}</p>}
              </>
            ) : (
              <>
                <span className="text-xs text-neutral-500">{formatDateTime(e.created_at)}</span>
                <p className="mt-1 text-neutral-300">{e.description}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

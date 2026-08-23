import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STUDIO_TZ } from "@/lib/date";
import type { Profile } from "@/lib/types/database";
import { CreatePassForm } from "./create-pass-form";
import { RevokePassButton } from "./revoke-pass-button";

type ExceptionPassRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  collaborator: Pick<Profile, "id" | "full_name"> | null;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

export default async function LiberacoesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: tatuadores }, { data: passes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .eq("role", "tatuador")
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
    supabase
      .from("collaborator_exception_passes")
      .select("id, starts_at, ends_at, collaborator:profiles!collaborator_exception_passes_collaborator_id_fkey(id, full_name)")
      .order("starts_at", { ascending: false })
      .limit(20)
      .returns<ExceptionPassRow[]>(),
  ]);

  const now = new Date();
  const active = (passes ?? []).filter((p) => new Date(p.ends_at) > now);
  const expired = (passes ?? []).filter((p) => new Date(p.ends_at) <= now);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Liberações fora do horário
        </h1>
        <p className="text-neutral-400">
          Autorize um tatuador específico a agendar, escolher maca e abrir
          comanda mesmo com o estúdio fechado (domingo ou fora do horário da
          unidade), por um tempo limitado.
        </p>
      </div>

      <CreatePassForm collaborators={tatuadores ?? []} />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-medium text-white">Liberações ativas</h2>
        {active.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">
            Nenhuma liberação ativa no momento.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {active.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-green-800 bg-green-500/10 px-4 py-2.5"
            >
              <div className="text-sm">
                <span className="font-medium text-neutral-100">
                  {p.collaborator?.full_name ?? "—"}
                </span>
                <span className="ml-2 text-neutral-400">
                  até {formatWhen(p.ends_at)}
                </span>
              </div>
              <RevokePassButton passId={p.id} />
            </div>
          ))}
        </div>
      </div>

      {expired.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-medium text-white">Histórico recente</h2>
          <div className="mt-3 flex flex-col gap-1 text-sm text-neutral-500">
            {expired.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span>{p.collaborator?.full_name ?? "—"}</span>
                <span>{formatWhen(p.starts_at)} — {formatWhen(p.ends_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ViewFichaButton } from "../../view-ficha-button";
import type { AnamneseForm } from "@/lib/types/database";

const PROCEDURE_LABEL: Record<string, string> = {
  tatuagem: "Tatuagem",
  piercing: "Piercing",
  ambos: "Ambos",
};

type Row = AnamneseForm & {
  appointment: { collaborator_id: string } | null;
};

export default async function TodasFichasPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: forms } = await supabase
    .from("anamnese_forms")
    .select("*, appointment:appointments(collaborator_id)")
    .not("signed_at", "is", null)
    .order("signed_at", { ascending: false })
    .returns<Row[]>();

  const list = forms ?? [];
  const collaboratorIds = [
    ...new Set(
      list
        .map((f) => f.collaborator_id ?? f.appointment?.collaborator_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const { data: collaborators } = collaboratorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", collaboratorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const collaboratorNameById = new Map(
    (collaborators ?? []).map((c) => [c.id, c.full_name || "Sem nome"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/fichas" className="text-sm text-neutral-500 hover:text-white">
          ← Fichas
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          Todas as Fichas de Anamnese
        </h1>
        <p className="text-neutral-400">
          Todas as fichas já preenchidas, de qualquer cliente e qualquer
          colaborador.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Telefone</th>
              <th className="py-3 pr-4 font-medium">Profissional</th>
              <th className="py-3 pr-4 font-medium">Procedimento</th>
              <th className="py-3 pr-4 font-medium">Preenchida em</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((f) => {
              const collaboratorId = f.collaborator_id ?? f.appointment?.collaborator_id;
              return (
                <tr key={f.id} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">{f.full_name}</td>
                  <td className="py-3 pr-4 text-neutral-300">{f.phone || "—"}</td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {collaboratorId ? collaboratorNameById.get(collaboratorId) ?? "—" : "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {f.procedure_type ? PROCEDURE_LABEL[f.procedure_type] : "—"}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-neutral-300">
                    {f.signed_at
                      ? new Date(f.signed_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {f.file_path && <ViewFichaButton filePath={f.file_path} />}
                      <Link
                        href={`/comandas/abrir?client_name=${encodeURIComponent(
                          f.full_name
                        )}&client_phone=${encodeURIComponent(f.phone)}${
                          collaboratorId ? `&collaborator_id=${collaboratorId}` : ""
                        }`}
                        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-3 py-1.5 text-sm font-medium text-neutral-950 transition hover:to-copper"
                      >
                        Abrir comanda
                      </Link>
                      <Link
                        href={`/agendamentos/novo?client_name=${encodeURIComponent(
                          f.full_name
                        )}&client_phone=${encodeURIComponent(f.phone)}${
                          collaboratorId ? `&collaborator_id=${collaboratorId}` : ""
                        }`}
                        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
                      >
                        Agendar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhuma ficha preenchida ainda.
          </p>
        )}
      </div>
    </div>
  );
}

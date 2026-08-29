import Link from "next/link";
import { requireAdminOrPiercingStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LobuloplastiaForm } from "@/lib/types/database";
import { NewFormGenerator } from "./new-form-generator";

export default async function LobuloplastiaListPage() {
  const { user } = await requireAdminOrPiercingStaff();
  const supabase = await createClient();

  const [{ data: forms }, { data: collaborators }] = await Promise.all([
    supabase
      .from("lobuloplastia_forms")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<LobuloplastiaForm[]>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["piercer", "chefe_piercing", "admin"])
      .eq("active", true)
      .order("full_name"),
  ]);

  const list = forms ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Lobuloplastia</h1>
        <p className="text-neutral-400">
          Fichas de anamnese/consentimento e acompanhamento de sessões.
        </p>
      </div>

      <NewFormGenerator collaborators={collaborators ?? []} currentUserId={user.id} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Telefone</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id} className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4">
                  <Link
                    href={`/lobuloplastia/ficha/${f.id}`}
                    className="text-neutral-100 hover:text-gold"
                  >
                    {f.full_name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-neutral-300">{f.phone}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      f.signed_at
                        ? "bg-green-500/15 text-green-400"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {f.signed_at ? "Assinada" : "Aguardando assinatura"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-neutral-300">
                  {new Date(f.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhuma ficha de lobuloplastia gerada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

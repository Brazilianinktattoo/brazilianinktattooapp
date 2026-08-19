import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types/database";
import { ClientRow } from "./client-row";
import { NewClientForm } from "./new-client-form";
import { CsvImportForm } from "./csv-import-form";

export default async function ClientesPage(props: PageProps<"/clientes">) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const supabase = await createClient();

  let query = supabase.from("clients").select("*").order("full_name");
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: clients } = await query.returns<Client[]>();

  const list = clients ?? [];
  const ids = list.map((c) => c.id);

  const { data: visits } = ids.length
    ? await supabase
        .from("appointments")
        .select("client_id, starts_at")
        .in("client_id", ids)
        .eq("status", "confirmado")
        .order("starts_at", { ascending: false })
    : { data: [] as { client_id: string | null; starts_at: string }[] };

  const lastVisitByClient = new Map<string, string>();
  for (const v of visits ?? []) {
    if (!v.client_id) continue;
    if (!lastVisitByClient.has(v.client_id)) {
      lastVisitByClient.set(v.client_id, v.starts_at);
    }
  }

  const registrarIds = [...new Set(list.map((c) => c.created_by).filter((id): id is string => !!id))];
  const { data: registrars } = registrarIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", registrarIds)
    : { data: [] as { id: string; full_name: string }[] };
  const registrarNameById = new Map((registrars ?? []).map((p) => [p.id, p.full_name || "Sem nome"]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Clientes</h1>
        <p className="text-neutral-400">
          Cadastro criado automaticamente ao agendar. Preencha o aniversário
          pra ativar a mensagem automática.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <NewClientForm />
        <div className="flex-1">
          <CsvImportForm />
        </div>
      </div>

      <form className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-sm text-neutral-300">
            Buscar por nome ou telefone
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Nome</th>
              <th className="py-3 pr-4 font-medium">Telefone</th>
              <th className="py-3 pr-4 font-medium">Aniversário</th>
              <th className="py-3 pr-4 font-medium">Última visita</th>
              <th className="py-3 pr-4 font-medium">Cadastrado por</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                lastVisit={lastVisitByClient.get(c.id) ?? null}
                registrarName={c.created_by ? (registrarNameById.get(c.created_by) ?? null) : null}
              />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            {q ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </p>
        )}
      </div>
    </div>
  );
}

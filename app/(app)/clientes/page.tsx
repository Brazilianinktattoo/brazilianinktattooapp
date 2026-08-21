import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds } from "@/lib/date";
import type { Client, Profile } from "@/lib/types/database";
import { ClientRow } from "./client-row";
import { NewClientForm } from "./new-client-form";
import { CsvImportForm } from "./csv-import-form";

export default async function ClientesPage(props: PageProps<"/clientes">) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";
  const collaboratorId =
    typeof searchParams.collaborator_id === "string" ? searchParams.collaborator_id : "";

  const supabase = await createClient();

  // Filtro por data de atendimento e/ou colaborador: acha os client_id que
  // batem nos agendamentos, e restringe a lista de clientes a esse
  // conjunto — combinável com a busca por nome/telefone (AND).
  let clientIdFilter: string[] | null = null;
  if (from || to || collaboratorId) {
    let apptQuery = supabase.from("appointments").select("client_id");
    if (from && to) {
      const { start, end } = rangeBounds(from, to);
      apptQuery = apptQuery.gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString());
    } else if (from) {
      const { start } = rangeBounds(from, from);
      apptQuery = apptQuery.gte("starts_at", start.toISOString());
    } else if (to) {
      const { end } = rangeBounds(to, to);
      apptQuery = apptQuery.lt("starts_at", end.toISOString());
    }
    if (collaboratorId) apptQuery = apptQuery.eq("collaborator_id", collaboratorId);

    const { data: matchingAppts } = await apptQuery;
    clientIdFilter = [
      ...new Set((matchingAppts ?? []).map((a) => a.client_id).filter((id): id is string => !!id)),
    ];
  }

  const { data: collaboratorOptions } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "tatuador", "piercer", "chefe_piercing"])
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name">[]>();

  let query = supabase.from("clients").select("*").order("full_name");
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (clientIdFilter) {
    query = query.in("id", clientIdFilter.length ? clientIdFilter : ["__none__"]);
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

  // Ficha de anamnese mais recente de cada cliente, pra "Ver ficha" e pra
  // pré-selecionar o profissional escolhido ao abrir o atendimento.
  type FormRow = {
    phone: string;
    file_path: string | null;
    signed_at: string | null;
    collaborator_id: string | null;
    appointment: { collaborator_id: string } | null;
  };
  const phones = list.map((c) => c.phone).filter(Boolean);
  const { data: forms } = phones.length
    ? await supabase
        .from("anamnese_forms")
        .select("phone, file_path, signed_at, collaborator_id, appointment:appointments(collaborator_id)")
        .in("phone", phones)
        .not("signed_at", "is", null)
        .order("signed_at", { ascending: false })
        .returns<FormRow[]>()
    : { data: [] as FormRow[] };
  const latestFormByPhone = new Map<string, FormRow>();
  for (const f of forms ?? []) {
    if (!latestFormByPhone.has(f.phone)) latestFormByPhone.set(f.phone, f);
  }

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

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 200 }}>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm text-neutral-300">
            Atendimento de
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm text-neutral-300">
            até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Colaborador
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            defaultValue={collaboratorId}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {(collaboratorOptions ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Buscar
        </button>
        {(q || from || to || collaboratorId) && (
          <a
            href="/clientes"
            className="text-sm text-neutral-500 hover:text-white"
          >
            Limpar filtros
          </a>
        )}
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
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const form = latestFormByPhone.get(c.phone);
              const collaboratorId = form?.collaborator_id ?? form?.appointment?.collaborator_id ?? null;
              return (
                <ClientRow
                  key={c.id}
                  client={c}
                  lastVisit={lastVisitByClient.get(c.id) ?? null}
                  registrarName={c.created_by ? (registrarNameById.get(c.created_by) ?? null) : null}
                  fichaFilePath={form?.file_path ?? null}
                  collaboratorId={collaboratorId}
                />
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            {q || from || to || collaboratorId
              ? "Nenhum cliente encontrado com esses filtros."
              : "Nenhum cliente cadastrado ainda."}
          </p>
        )}
      </div>
    </div>
  );
}

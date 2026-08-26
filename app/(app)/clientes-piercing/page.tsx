import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds } from "@/lib/date";
import type { Client, Profile } from "@/lib/types/database";
import { ClientRow } from "../clientes/client-row";
import { NewClientForm } from "../clientes/new-client-form";

// Mesma listagem do CRM geral (/clientes), só que filtrada pra clientes com
// histórico de piercing — eles continuam aparecendo no CRM geral também,
// essa aba é um recorte a mais, não uma remoção de lá.
export default async function ClientesPiercingPage(
  props: PageProps<"/clientes-piercing">
) {
  const searchParams = await props.searchParams;
  await requireAdminOrChefePiercing();
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";
  const collaboratorId =
    typeof searchParams.collaborator_id === "string" ? searchParams.collaborator_id : "";

  const supabase = await createClient();

  // client_id de todo mundo que já foi atendido por um piercer/chefe de
  // piercing — a base do "é cliente de piercing" (some, some conjunto, sem
  // se importar com a data).
  const { data: piercingAppts } = await supabase
    .from("appointments")
    .select("client_id, collaborator:profiles!appointments_collaborator_id_fkey(role)")
    .not("client_id", "is", null)
    .returns<{ client_id: string; collaborator: { role: string } | null }[]>();
  const piercingClientIds = [
    ...new Set(
      (piercingAppts ?? [])
        .filter((a) => a.collaborator?.role === "piercer" || a.collaborator?.role === "chefe_piercing")
        .map((a) => a.client_id)
    ),
  ];

  let clientIdFilter: string[] = piercingClientIds;
  if (from || to || collaboratorId) {
    let apptQuery = supabase.from("appointments").select("client_id").not("client_id", "is", null);
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
    const matchingIds = new Set((matchingAppts ?? []).map((a) => a.client_id as string));
    clientIdFilter = piercingClientIds.filter((id) => matchingIds.has(id));
  }

  const { data: collaboratorOptions } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["piercer", "chefe_piercing"])
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name">[]>();

  let query = supabase
    .from("clients")
    .select("*")
    .in("id", clientIdFilter.length ? clientIdFilter : ["__none__"])
    .order("full_name");
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
        <h1 className="text-xl font-semibold text-white">Clientes Piercing</h1>
        <p className="text-neutral-400">
          Clientes já atendidos por algum body piercer, nas duas unidades —
          esse mesmo cliente também aparece no CRM geral, essa é só uma visão
          filtrada.
        </p>
      </div>

      <NewClientForm />

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
            Body Piercer
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
            href="/clientes-piercing"
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
              const rowCollaboratorId = form?.collaborator_id ?? form?.appointment?.collaborator_id ?? null;
              return (
                <ClientRow
                  key={c.id}
                  client={c}
                  lastVisit={lastVisitByClient.get(c.id) ?? null}
                  registrarName={c.created_by ? (registrarNameById.get(c.created_by) ?? null) : null}
                  fichaFilePath={form?.file_path ?? null}
                  collaboratorId={rowCollaboratorId}
                />
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            {q || from || to || collaboratorId
              ? "Nenhum cliente de piercing encontrado com esses filtros."
              : "Nenhum cliente de piercing ainda."}
          </p>
        )}
      </div>
    </div>
  );
}

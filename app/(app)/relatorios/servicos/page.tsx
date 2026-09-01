import Link from "next/link";
import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatStudioDate, monthStartParam, todayParam } from "@/lib/date";
import { fetchServiceReportLines, summarizeServiceReport } from "@/lib/reports/servicos";
import type { Profile, Unit } from "@/lib/types/database";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
};

function buildQuery(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  return usp.toString();
}

export default async function RelatorioServicosPage(
  props: PageProps<"/relatorios/servicos">
) {
  const searchParams = await props.searchParams;
  const { profile } = await requireAdminOrChefePiercing();
  const isChefePiercing = profile.role === "chefe_piercing";

  const str = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : "");

  const kindParam = str("kind");
  const filters = {
    from: str("from") || monthStartParam(),
    to: str("to") || todayParam(),
    collaboratorId: str("collaborator_id") || undefined,
    unitId: str("unit_id") || undefined,
    serviceQuery: str("service") || undefined,
    clientQuery: str("client") || undefined,
    kind:
      kindParam === "servico" || kindParam === "venda_joia"
        ? (kindParam as "servico" | "venda_joia")
        : undefined,
  };

  const supabase = await createClient();
  const [{ data: collaborators }, { data: units }, allLines] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", isChefePiercing ? ["piercer", "chefe_piercing"] : ["tatuador", "piercer", "admin", "chefe_piercing"])
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    fetchServiceReportLines(supabase, filters),
  ]);

  // Chefe de Piercing só vê os dados de piercing, das duas unidades — sem
  // acesso ao que é de tatuagem.
  const lines = isChefePiercing ? allLines.filter((l) => l.category === "Piercing") : allLines;

  const summary = summarizeServiceReport(lines);
  const exportQuery = buildQuery({
    from: filters.from,
    to: filters.to,
    collaborator_id: filters.collaboratorId,
    unit_id: filters.unitId,
    service: filters.serviceQuery,
    client: filters.clientQuery,
    kind: filters.kind,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-neutral-500 hover:text-white">
          ← Relatórios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          {isChefePiercing ? "Relatório de Serviços — Piercing" : "Relatório de Serviços"}
        </h1>
        <p className="text-neutral-400">
          Serviços de comandas fechadas, com comissão calculada pela regra do
          estúdio (Barra Shopping 50% linear · Downtown 70% cliente próprio /
          50% cliente do estúdio).
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm text-neutral-300">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={filters.from}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm text-neutral-300">
            Até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={filters.to}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit_id" className="text-sm text-neutral-300">
            Unidade
          </label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={filters.unitId ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todas</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Profissional
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            defaultValue={filters.collaboratorId ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {(collaborators ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"} — {ROLE_LABEL[c.role] ?? c.role}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="service" className="text-sm text-neutral-300">
            Tipo de serviço
          </label>
          <input
            id="service"
            name="service"
            defaultValue={filters.serviceQuery ?? ""}
            placeholder="Ex: fechamento"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client" className="text-sm text-neutral-300">
            Cliente
          </label>
          <input
            id="client"
            name="client"
            defaultValue={filters.clientQuery ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kind" className="text-sm text-neutral-300">
            Tipo
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            <option value="servico">Serviço</option>
            <option value="venda_joia">Venda de jóia</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className={`grid gap-4 ${isChefePiercing ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Total</h2>
          <p className="mt-1 text-sm text-neutral-400">{summary.total.atendimentos} atendimento(s)</p>
          <p className="text-lg font-semibold text-white">{money(summary.total.faturado)}</p>
          <p className="text-sm text-neutral-400">comissão {money(summary.total.comissao)}</p>
        </div>
        {!isChefePiercing && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
            <h2 className="font-semibold text-white">Tatuagem</h2>
            <p className="mt-1 text-sm text-neutral-400">{summary.tatuagem.atendimentos} atendimento(s)</p>
            <p className="text-lg font-semibold text-white">{money(summary.tatuagem.faturado)}</p>
            <p className="text-sm text-neutral-400">comissão {money(summary.tatuagem.comissao)}</p>
          </div>
        )}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Piercing</h2>
          <p className="mt-1 text-sm text-neutral-400">{summary.piercing.atendimentos} atendimento(s)</p>
          <p className="text-lg font-semibold text-white">{money(summary.piercing.faturado)}</p>
          <p className="text-sm text-neutral-400">comissão {money(summary.piercing.comissao)}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={`/relatorios/servicos/export/csv?${exportQuery}`}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Exportar CSV
        </a>
        <a
          href={`/relatorios/servicos/export/pdf?${exportQuery}`}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Exportar PDF
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Data</th>
              <th className="py-3 pr-4 font-medium">Unidade</th>
              <th className="py-3 pr-4 font-medium">Colaborador</th>
              <th className="py-3 pr-4 font-medium">Categoria</th>
              <th className="py-3 pr-4 font-medium">Tipo</th>
              <th className="py-3 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Serviço</th>
              <th className="py-3 pr-4 font-medium">Valor</th>
              <th className="py-3 pr-4 font-medium">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.serviceId} className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4 text-neutral-300 whitespace-nowrap">
                  {l.date ? formatStudioDate(l.date) : "—"}
                </td>
                <td className="py-3 pr-4 text-neutral-300">{l.unitName}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.collaboratorName}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.category}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.kind}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.clientName}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.description}</td>
                <td className="py-3 pr-4 text-neutral-300">{money(l.price)}</td>
                <td className="py-3 pr-4 text-neutral-300">
                  {money(l.commission)}
                  <span className="ml-1 text-xs text-neutral-500">
                    ({Math.round(l.commissionRate * 100)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum serviço encontrado com esses filtros.
          </p>
        )}
      </div>
    </div>
  );
}

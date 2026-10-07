import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, formatStudioDate, shiftDate, todayParam } from "@/lib/date";
import { fetchRaioX, type GroupRow } from "@/lib/reports/raio-x";
import type { Unit } from "@/lib/types/database";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

const SERVICE_COLOR: Record<string, string> = {
  tatuagem: "#c9a961",
  piercing: "#8fb8c9",
  joia: "#b8763f",
  curso: "#9a8fc9",
  outros: "#6b6b6b",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function GroupTable({ title, rows, firstCol }: { title: string; rows: GroupRow[]; firstCol: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-white">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">{firstCol}</th>
              <th className="py-3 pr-4 font-medium">Clientes</th>
              <th className="py-3 pr-4 font-medium">% do total</th>
              <th className="py-3 pr-4 font-medium">Voltaram</th>
              <th className="py-3 pr-4 font-medium">Taxa de retorno</th>
              <th className="py-3 pr-4 font-medium">Faturamento</th>
              <th className="py-3 pr-4 font-medium">% do fat.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-neutral-800 text-neutral-300">
                <td className="py-3 pl-4 pr-4 text-neutral-100">{r.label}</td>
                <td className="py-3 pr-4">{r.clients}</td>
                <td className="py-3 pr-4">{pct(r.clientsPct)}</td>
                <td className="py-3 pr-4">{r.returned}</td>
                <td className="py-3 pr-4">{pct(r.returnRate)}</td>
                <td className="py-3 pr-4">{money(r.revenue)}</td>
                <td className="py-3 pr-4">{pct(r.revenuePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-neutral-500">Sem dados no período.</p>}
      </div>
    </section>
  );
}

export default async function RaioXPage(props: PageProps<"/raio-x">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const today = todayParam();
  const from = str("from") || shiftDate(today, -365);
  const to = str("to") || today;
  const unitId = str("unit_id") || undefined;

  const supabase = await createClient();
  const [{ data: units }, data] = await Promise.all([
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    fetchRaioX(supabase, { from, to, unitId }),
  ]);
  const o = data.overview;
  const maxMonth = Math.max(
    1,
    ...data.byMonth.map((m) => m.tatuagem + m.piercing + m.joia + m.curso + m.outros)
  );
  const inputCls =
    "rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Raio-X</h1>
        <p className="text-neutral-400">
          Calculado automaticamente das comandas fechadas. A origem de cada cliente é a da primeira
          comanda dele.
          {data.firstComandaDate && (
            <> Histórico disponível desde {formatStudioDate(`${data.firstComandaDate}T12:00:00Z`)}.</>
          )}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm text-neutral-300">De</label>
          <input id="from" name="from" type="date" defaultValue={from} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm text-neutral-300">Até</label>
          <input id="to" name="to" type="date" defaultValue={to} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit_id" className="text-sm text-neutral-300">Unidade</label>
          <select id="unit_id" name="unit_id" defaultValue={unitId ?? ""} className={inputCls}>
            <option value="">Todas</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 font-medium text-neutral-950 transition hover:to-copper"
        >
          Filtrar
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Visão geral</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Faturamento" value={money(o.revenue)} />
          <Stat label="Atendimentos" value={String(o.visits)} />
          <Stat label="Clientes únicos" value={String(o.uniqueClients)} />
          <Stat label="Clientes que voltaram" value={String(o.returnedClients)} sub="2+ dias de atendimento no período" />
          <Stat label="Taxa de retorno" value={pct(o.returnRate)} />
          <Stat label="Ticket médio" value={money(o.ticket)} sub="por atendimento" />
          <Stat label="Gasto médio por cliente" value={money(o.spendPerClient)} />
        </div>
        {o.unidentifiedVisits > 0 && (
          <p className="rounded-lg border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-300">
            {o.unidentifiedVisits} atendimento(s) sem cliente cadastrado (sem telefone) entram no
            faturamento, mas ficam de fora das contas de clientes e retorno.
          </p>
        )}
      </section>

      <p className="-mb-4 text-xs text-neutral-500">
        Nas tabelas de origem, faturamento e % consideram só atendimentos com cliente cadastrado.
      </p>
      <GroupTable title="Casa x Tatuador" rows={data.byOrigin} firstCol="Quem trouxe" />
      <GroupTable title="Por como conheceu" rows={data.byHowMet} firstCol="Como conheceu" />

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-white">Por profissional</h2>
        <p className="text-xs text-neutral-500">
          Clientes novos = primeira comanda deles no estúdio foi com o profissional, dentro do
          período. &quot;Voltaram&quot; = fizeram outra comanda em outro dia, com qualquer profissional.
        </p>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Profissional</th>
                <th className="py-3 pr-4 font-medium">Atend.</th>
                <th className="py-3 pr-4 font-medium">Faturamento</th>
                <th className="py-3 pr-4 font-medium">% do fat.</th>
                <th className="py-3 pr-4 font-medium">Ticket médio</th>
                <th className="py-3 pr-4 font-medium">Clientes novos</th>
                <th className="py-3 pr-4 font-medium">% trazidos por ele</th>
                <th className="py-3 pr-4 font-medium">Voltaram</th>
                <th className="py-3 pr-4 font-medium">Taxa de retorno</th>
              </tr>
            </thead>
            <tbody>
              {data.byProfessional.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800 text-neutral-300">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">{p.name}</td>
                  <td className="py-3 pr-4">{p.visits}</td>
                  <td className="py-3 pr-4">{money(p.revenue)}</td>
                  <td className="py-3 pr-4">{pct(p.revenuePct)}</td>
                  <td className="py-3 pr-4">{money(p.ticket)}</td>
                  <td className="py-3 pr-4">{p.newClients}</td>
                  <td className="py-3 pr-4">{pct(p.ownPct)}</td>
                  <td className="py-3 pr-4">{p.returned}</td>
                  <td className="py-3 pr-4">{pct(p.returnRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.byProfessional.length === 0 && (
            <p className="p-6 text-center text-neutral-500">Sem dados no período.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Por serviço e por mês</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.byService.map((s) => (
            <Stat key={s.key} label={s.label} value={money(s.revenue)} sub={`${pct(s.pct)} do total`} />
          ))}
        </div>
        {!unitId && (
          <p className="text-xs text-neutral-500">Cursos entram só quando a unidade é &quot;Todas&quot;.</p>
        )}
        <div className="overflow-x-auto rounded-xl border border-neutral-800 p-4">
          <div className="flex min-w-[520px] items-end gap-3" style={{ height: 220 }}>
            {data.byMonth.map((m) => {
              const parts = (["tatuagem", "piercing", "joia", "curso", "outros"] as const).filter(
                (k) => m[k] > 0
              );
              const tot = parts.reduce((s, k) => s + m[k], 0);
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                  <span className="text-[11px] text-neutral-400">{money(tot)}</span>
                  <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm" style={{ height: `${(tot / maxMonth) * 85}%` }}>
                    {parts.map((k) => (
                      <div key={k} title={`${k}: ${money(m[k])}`} style={{ height: `${(m[k] / tot) * 100}%`, background: SERVICE_COLOR[k] }} />
                    ))}
                  </div>
                  <span className="text-[11px] capitalize text-neutral-500">
                    {formatMonthLabel(m.month).replace(" de ", "/")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-400">
            {Object.entries({ tatuagem: "Tatuagem", piercing: "Piercing", joia: "Jóias", curso: "Cursos", outros: "Produtos/outros" }).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERVICE_COLOR[k] }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-white">Sem retorno há mais de 12 meses ({data.inactive.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Cliente</th>
                <th className="py-3 pr-4 font-medium">Telefone</th>
                <th className="py-3 pr-4 font-medium">Última visita</th>
              </tr>
            </thead>
            <tbody>
              {data.inactive.map((c, i) => (
                <tr key={i} className="border-b border-neutral-800 text-neutral-300">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">{c.name}</td>
                  <td className="py-3 pr-4">{c.phone}</td>
                  <td className="py-3 pr-4">{formatStudioDate(`${c.lastVisit}T12:00:00Z`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.inactive.length === 0 && (
            <p className="p-6 text-center text-neutral-500">
              Nenhum cliente nessa situação ainda — o histórico do sistema é recente.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

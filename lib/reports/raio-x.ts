import { dateParamFromISO, monthOf, rangeBounds, todayParam } from "@/lib/date";
import { resolveClientIsOwn } from "@/lib/commission";
import { normalizePhone } from "@/lib/phone";
import { fetchCursoLines } from "@/lib/reports/fechamento";
import { createClient } from "@/lib/supabase/server";
import type { ClientOrigin, HowMet } from "@/lib/types/database";
import { HOW_MET_LABEL } from "@/lib/anamnese-origin";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RaioXFilters = { from: string; to: string; unitId?: string };

type AnamneseInfo = {
  client_origin: ClientOrigin | null;
  how_met: HowMet | null;
  signed_at: string | null;
};

type RawComanda = {
  id: string;
  closed_at: string;
  gross_amount: number | null;
  client_is_own_override: boolean | null;
  unit: { id: string; name: string } | null;
  collaborator: { id: string; full_name: string; role: string } | null;
  appointment: {
    client_id: string | null;
    client_name: string;
    client_phone: string;
    client_is_own: boolean;
    anamnese_forms: AnamneseInfo | null;
  } | null;
  comanda_services: { price: number }[];
  comanda_jewelry: { value: number }[];
};

type Comanda = {
  closedAt: string;
  day: string;
  month: string;
  gross: number;
  unitId: string;
  collaboratorId: string;
  collaboratorName: string;
  role: string;
  servicesTotal: number;
  jewelryTotal: number;
  clientKey: string | null;
  clientName: string;
  clientPhone: string;
  clientIsOwn: boolean;
  howMet: HowMet | null;
};

export const NOT_INFORMED = "nao_informado";
export type HowMetKey = HowMet | typeof NOT_INFORMED;
export const HOW_MET_KEY_LABEL: Record<HowMetKey, string> = {
  ...HOW_MET_LABEL,
  nao_informado: "Não informado",
};

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; ; page++) {
    const { data } = await build(page * 1000, page * 1000 + 999);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export type GroupRow = {
  key: string;
  label: string;
  clients: number;
  clientsPct: number;
  returned: number;
  returnRate: number;
  revenue: number;
  revenuePct: number;
};

export type ProfessionalRow = {
  id: string;
  name: string;
  visits: number;
  revenue: number;
  revenuePct: number;
  ticket: number;
  newClients: number;
  ownPct: number;
  returned: number;
  returnRate: number;
};

export type MonthRow = {
  month: string;
  tatuagem: number;
  piercing: number;
  joia: number;
  curso: number;
  outros: number;
};

export type RaioX = {
  overview: {
    revenue: number;
    visits: number;
    uniqueClients: number;
    returnedClients: number;
    returnRate: number;
    ticket: number;
    spendPerClient: number;
    unidentifiedVisits: number;
  };
  byOrigin: GroupRow[];
  byHowMet: GroupRow[];
  byProfessional: ProfessionalRow[];
  byService: { key: string; label: string; revenue: number; pct: number }[];
  byMonth: MonthRow[];
  inactive: { name: string; phone: string; lastVisit: string }[];
  firstComandaDate: string | null;
};

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export async function fetchRaioX(
  supabase: SupabaseServerClient,
  filters: RaioXFilters
): Promise<RaioX> {
  const [raw, forms] = await Promise.all([
    fetchAll<RawComanda>((f, t) =>
      supabase
        .from("comandas")
        .select(
          "id, closed_at, gross_amount, client_is_own_override, unit:units(id, name), collaborator:profiles!comandas_collaborator_id_fkey(id, full_name, role), appointment:appointments!comandas_appointment_id_fkey(client_id, client_name, client_phone, client_is_own, anamnese_forms(client_origin, how_met, signed_at)), comanda_services(price), comanda_jewelry(value)"
        )
        .eq("status", "fechada")
        .not("closed_at", "is", null)
        .order("closed_at")
        .range(f, t)
        .returns<RawComanda[]>()
    ),
    fetchAll<AnamneseInfo & { phone: string }>((f, t) =>
      supabase
        .from("anamnese_forms")
        .select("phone, client_origin, how_met, signed_at")
        .not("signed_at", "is", null)
        .order("signed_at")
        .range(f, t)
        .returns<(AnamneseInfo & { phone: string })[]>()
    ),
  ]);

  // Ficha mais antiga por telefone — cobre comandas abertas direto da ficha,
  // em que o agendamento não tem a ficha ligada.
  const formByPhone = new Map<string, AnamneseInfo>();
  for (const f of forms) {
    const p = normalizePhone(f.phone);
    if (p && !formByPhone.has(p)) formByPhone.set(p, f);
  }

  const all: Comanda[] = raw.map((c) => {
    const appt = c.appointment;
    const phone = normalizePhone(appt?.client_phone ?? "");
    const form = appt?.anamnese_forms ?? (phone ? formByPhone.get(phone) : undefined) ?? null;
    const day = dateParamFromISO(c.closed_at);
    return {
      closedAt: c.closed_at,
      day,
      month: monthOf(day),
      gross: c.gross_amount ?? 0,
      unitId: c.unit?.id ?? "",
      collaboratorId: c.collaborator?.id ?? "",
      collaboratorName: c.collaborator?.full_name || "Sem nome",
      role: c.collaborator?.role ?? "",
      servicesTotal: c.comanda_services.reduce((s, i) => s + i.price, 0),
      jewelryTotal: c.comanda_jewelry.reduce((s, i) => s + i.value, 0),
      clientKey: appt?.client_id ?? (phone ? `tel:${phone}` : null),
      clientName: appt?.client_name ?? "",
      clientPhone: phone,
      clientIsOwn: resolveClientIsOwn(
        appt?.client_is_own ?? false,
        form?.client_origin,
        form?.signed_at,
        c.client_is_own_override
      ),
      howMet: form?.how_met ?? null,
    };
  });

  // Origem de cada cliente = a da PRIMEIRA comanda dele (histórico inteiro).
  const byClient = new Map<string, Comanda[]>();
  for (const c of all) {
    if (!c.clientKey) continue;
    const list = byClient.get(c.clientKey) ?? [];
    list.push(c);
    byClient.set(c.clientKey, list);
  }
  const firstOf = new Map<string, Comanda>();
  for (const [k, list] of byClient) firstOf.set(k, list[0]);

  const { start, end } = rangeBounds(filters.from, filters.to);
  const inRangeDate = (c: Comanda) => {
    const t = new Date(c.closedAt);
    return t >= start && t < end;
  };
  const inPeriod = all.filter(
    (c) => inRangeDate(c) && (!filters.unitId || c.unitId === filters.unitId)
  );

  // Visitas distintas (dias) por cliente dentro do período.
  const periodDays = new Map<string, Set<string>>();
  const periodRevenue = new Map<string, number>();
  for (const c of inPeriod) {
    if (!c.clientKey) continue;
    if (!periodDays.has(c.clientKey)) periodDays.set(c.clientKey, new Set());
    periodDays.get(c.clientKey)!.add(c.day);
    periodRevenue.set(c.clientKey, (periodRevenue.get(c.clientKey) ?? 0) + c.gross);
  }
  const clientKeys = [...periodDays.keys()];
  const returnedSet = new Set(clientKeys.filter((k) => periodDays.get(k)!.size >= 2));

  const revenue = inPeriod.reduce((s, c) => s + c.gross, 0);
  const identifiedRevenue = clientKeys.reduce((s, k) => s + (periodRevenue.get(k) ?? 0), 0);
  const unidentifiedVisits = inPeriod.filter((c) => !c.clientKey).length;

  function groupRows(
    keyOf: (first: Comanda) => string,
    labelOf: (key: string) => string,
    order: string[]
  ): GroupRow[] {
    const acc = new Map<string, { clients: number; returned: number; revenue: number }>();
    for (const k of clientKeys) {
      const g = keyOf(firstOf.get(k)!);
      const a = acc.get(g) ?? { clients: 0, returned: 0, revenue: 0 };
      a.clients += 1;
      if (returnedSet.has(k)) a.returned += 1;
      a.revenue += periodRevenue.get(k) ?? 0;
      acc.set(g, a);
    }
    return order
      .filter((k) => acc.has(k))
      .map((k) => {
        const a = acc.get(k)!;
        return {
          key: k,
          label: labelOf(k),
          clients: a.clients,
          clientsPct: safeDiv(a.clients, clientKeys.length),
          returned: a.returned,
          returnRate: safeDiv(a.returned, a.clients),
          revenue: a.revenue,
          revenuePct: safeDiv(a.revenue, identifiedRevenue),
        };
      });
  }

  const byOrigin = groupRows(
    (f) => (f.clientIsOwn ? "tatuador" : "estudio"),
    (k) => (k === "tatuador" ? "Tatuador" : "Casa (estúdio)"),
    ["estudio", "tatuador"]
  );
  const byHowMet = groupRows(
    (f) => f.howMet ?? NOT_INFORMED,
    (k) => HOW_MET_KEY_LABEL[k as HowMetKey],
    [...Object.keys(HOW_MET_LABEL), NOT_INFORMED]
  );

  // Por profissional.
  const profAcc = new Map<
    string,
    { name: string; visits: number; revenue: number; newKeys: string[] }
  >();
  for (const c of inPeriod) {
    const a = profAcc.get(c.collaboratorId) ?? {
      name: c.collaboratorName,
      visits: 0,
      revenue: 0,
      newKeys: [],
    };
    a.visits += 1;
    a.revenue += c.gross;
    profAcc.set(c.collaboratorId, a);
  }
  for (const k of byClient.keys()) {
    const first = firstOf.get(k)!;
    if (!inRangeDate(first) || (filters.unitId && first.unitId !== filters.unitId)) continue;
    profAcc.get(first.collaboratorId)?.newKeys.push(k);
  }
  const byProfessional: ProfessionalRow[] = [...profAcc.entries()]
    .map(([id, a]) => {
      const own = a.newKeys.filter((k) => firstOf.get(k)!.clientIsOwn).length;
      // "Voltou à casa" = tem comanda em outro dia depois da primeira, com
      // qualquer profissional (até hoje, não só dentro do período).
      const back = a.newKeys.filter((k) => new Set(byClient.get(k)!.map((c) => c.day)).size >= 2)
        .length;
      return {
        id,
        name: a.name,
        visits: a.visits,
        revenue: a.revenue,
        revenuePct: safeDiv(a.revenue, revenue),
        ticket: safeDiv(a.revenue, a.visits),
        newClients: a.newKeys.length,
        ownPct: safeDiv(own, a.newKeys.length),
        returned: back,
        returnRate: safeDiv(back, a.newKeys.length),
      };
    })
    .sort((x, y) => y.revenue - x.revenue);

  // Por serviço e por mês (tatuagem/piercing pelo cargo de quem atendeu).
  const monthMap = new Map<string, MonthRow>();
  const total = { tatuagem: 0, piercing: 0, joia: 0, curso: 0, outros: 0 };
  const monthRow = (m: string) => {
    let r = monthMap.get(m);
    if (!r) {
      r = { month: m, tatuagem: 0, piercing: 0, joia: 0, curso: 0, outros: 0 };
      monthMap.set(m, r);
    }
    return r;
  };
  for (const c of inPeriod) {
    const row = monthRow(c.month);
    const svc = c.role === "tatuador" || c.role === "admin" ? "tatuagem" : "piercing";
    const rest = Math.max(0, c.gross - c.servicesTotal - c.jewelryTotal);
    row[svc] += c.servicesTotal;
    row.joia += c.jewelryTotal;
    row.outros += rest;
    total[svc] += c.servicesTotal;
    total.joia += c.jewelryTotal;
    total.outros += rest;
  }
  if (!filters.unitId) {
    const cursos = await fetchCursoLines(supabase, filters.from, filters.to);
    for (const l of cursos) {
      monthRow(monthOf(dateParamFromISO(l.date))).curso += l.amount;
      total.curso += l.amount;
    }
  }
  const grand = Object.values(total).reduce((s, v) => s + v, 0);
  const byService = (
    [
      ["tatuagem", "Tatuagem"],
      ["piercing", "Piercing"],
      ["joia", "Jóias"],
      ["curso", "Cursos"],
      ["outros", "Produtos/outros"],
    ] as const
  )
    .filter(([k]) => total[k] > 0)
    .map(([k, label]) => ({ key: k, label, revenue: total[k], pct: safeDiv(total[k], grand) }));
  const byMonth = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  // Sem retorno há mais de 12 meses (histórico inteiro, qualquer unidade).
  const limit = new Date(`${todayParam()}T00:00:00-03:00`);
  limit.setFullYear(limit.getFullYear() - 1);
  const inactive: RaioX["inactive"] = [];
  for (const list of byClient.values()) {
    const last = list[list.length - 1];
    if (new Date(last.closedAt) >= limit) continue;
    const named = [...list].reverse().find((c) => c.clientName) ?? last;
    inactive.push({
      name: named.clientName || "Sem nome",
      phone: last.clientPhone || "—",
      lastVisit: last.day,
    });
  }
  inactive.sort((a, b) => a.lastVisit.localeCompare(b.lastVisit));

  return {
    overview: {
      revenue,
      visits: inPeriod.length,
      uniqueClients: clientKeys.length,
      returnedClients: returnedSet.size,
      returnRate: safeDiv(returnedSet.size, clientKeys.length),
      ticket: safeDiv(revenue, inPeriod.length),
      spendPerClient: safeDiv(identifiedRevenue, clientKeys.length),
      unidentifiedVisits,
    },
    byOrigin,
    byHowMet,
    byProfessional,
    byService,
    byMonth,
    inactive,
    firstComandaDate: all[0]?.day ?? null,
  };
}

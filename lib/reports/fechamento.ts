import { rangeBounds } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { fetchServiceReportLines } from "@/lib/reports/servicos";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type FinanceSegment = "tatuagem" | "piercing" | "coworking" | "curso";

export const SEGMENT_LABEL: Record<FinanceSegment, string> = {
  tatuagem: "Tatuagem",
  piercing: "Piercing",
  coworking: "Coworking",
  curso: "Curso",
};

export type FinanceFilters = {
  from: string;
  to: string;
  segment?: FinanceSegment;
  collaboratorId?: string;
  unitId?: string;
  serviceQuery?: string;
};

export type FinanceLine = {
  id: string;
  date: string;
  segment: FinanceSegment;
  unitId: string;
  unitName: string;
  collaboratorId: string;
  collaboratorName: string;
  serviceName: string;
  clientName: string;
  amount: number;
};

async function fetchCoworkingLines(
  supabase: SupabaseServerClient,
  from: string,
  to: string
): Promise<FinanceLine[]> {
  const { start, end } = rangeBounds(from, to);
  const { data } = await supabase
    .from("coworking_passes")
    .select(
      "id, guest_name, fixed_fee, percentage, reported_revenue, starts_at, unit:units(id, name)"
    )
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .returns<
      {
        id: string;
        guest_name: string;
        fixed_fee: number;
        percentage: number;
        reported_revenue: number;
        starts_at: string;
        unit: { id: string; name: string } | null;
      }[]
    >();

  return (data ?? []).map((p) => ({
    id: `cw-${p.id}`,
    date: p.starts_at,
    segment: "coworking" as const,
    unitId: p.unit?.id ?? "",
    unitName: p.unit?.name ?? "—",
    collaboratorId: "",
    collaboratorName: p.guest_name,
    serviceName: "Locação de espaço (coworking)",
    clientName: p.guest_name,
    amount:
      Number(p.fixed_fee) + (Number(p.percentage) / 100) * Number(p.reported_revenue),
  }));
}

async function fetchCursoLines(
  supabase: SupabaseServerClient,
  from: string,
  to: string
): Promise<FinanceLine[]> {
  const { start, end } = rangeBounds(from, to);
  const { data: payments } = await supabase
    .from("course_payments")
    .select("id, amount, paid_at, enrollment_id")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString())
    .returns<
      { id: string; amount: number; paid_at: string; enrollment_id: string }[]
    >();

  const list = payments ?? [];
  if (list.length === 0) return [];

  const enrollmentIds = [...new Set(list.map((p) => p.enrollment_id))];
  const { data: enrollments } = await supabase
    .from("course_enrollments")
    .select("id, full_name, course_class_id")
    .in("id", enrollmentIds)
    .returns<{ id: string; full_name: string; course_class_id: string }[]>();

  const classIds = [...new Set((enrollments ?? []).map((e) => e.course_class_id))];
  const { data: classes } = classIds.length
    ? await supabase
        .from("course_classes")
        .select("id, name")
        .in("id", classIds)
        .returns<{ id: string; name: string }[]>()
    : { data: [] as { id: string; name: string }[] };

  const enrollmentById = new Map((enrollments ?? []).map((e) => [e.id, e]));
  const classById = new Map((classes ?? []).map((c) => [c.id, c]));

  return list.map((p) => {
    const enrollment = enrollmentById.get(p.enrollment_id);
    const courseClass = enrollment ? classById.get(enrollment.course_class_id) : undefined;
    return {
      id: `crs-${p.id}`,
      date: p.paid_at,
      segment: "curso" as const,
      unitId: "",
      unitName: "—",
      collaboratorId: "",
      collaboratorName: "",
      serviceName: courseClass?.name ?? "Curso",
      clientName: enrollment?.full_name ?? "",
      amount: p.amount,
    };
  });
}

export async function fetchFinanceLines(
  supabase: SupabaseServerClient,
  filters: FinanceFilters
): Promise<FinanceLine[]> {
  const [serviceLines, coworkingLines, cursoLines] = await Promise.all([
    fetchServiceReportLines(supabase, { from: filters.from, to: filters.to }),
    fetchCoworkingLines(supabase, filters.from, filters.to),
    fetchCursoLines(supabase, filters.from, filters.to),
  ]);

  const tatPiercingLines: FinanceLine[] = serviceLines
    .filter((l) => l.category === "Tatuagem" || l.category === "Piercing")
    .map((l) => ({
      id: `svc-${l.serviceId}`,
      date: l.date,
      segment: l.category === "Tatuagem" ? ("tatuagem" as const) : ("piercing" as const),
      unitId: l.unitId,
      unitName: l.unitName,
      collaboratorId: l.collaboratorId,
      collaboratorName: l.collaboratorName,
      serviceName: l.description,
      clientName: l.clientName,
      amount: l.price,
    }));

  let lines = [...tatPiercingLines, ...coworkingLines, ...cursoLines];

  if (filters.segment) lines = lines.filter((l) => l.segment === filters.segment);
  if (filters.collaboratorId) {
    lines = lines.filter((l) => l.collaboratorId === filters.collaboratorId);
  }
  if (filters.unitId) lines = lines.filter((l) => l.unitId === filters.unitId);
  if (filters.serviceQuery) {
    const q = filters.serviceQuery.toLowerCase();
    lines = lines.filter((l) => l.serviceName.toLowerCase().includes(q));
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));
  return lines;
}

export type FinanceSummary = {
  total: number;
  count: number;
  bySegment: Record<FinanceSegment, { total: number; count: number }>;
};

export function summarizeFinanceLines(lines: FinanceLine[]): FinanceSummary {
  const bySegment = {
    tatuagem: { total: 0, count: 0 },
    piercing: { total: 0, count: 0 },
    coworking: { total: 0, count: 0 },
    curso: { total: 0, count: 0 },
  };
  for (const l of lines) {
    bySegment[l.segment].total += l.amount;
    bySegment[l.segment].count += 1;
  }
  return {
    total: lines.reduce((s, l) => s + l.amount, 0),
    count: lines.length,
    bySegment,
  };
}

export type MonthlyClosing = {
  month: string;
  label: string;
  bySegment: Record<FinanceSegment, number>;
  total: number;
};

// Mês em fuso do estúdio, não UTC — evita virada de mês errada perto da
// meia-noite (mesma lógica de dayBounds em lib/date.ts).
function monthKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).slice(0, 7);
}

export function groupByMonth(lines: FinanceLine[]): MonthlyClosing[] {
  const byMonth = new Map<string, MonthlyClosing>();
  for (const l of lines) {
    const key = monthKey(l.date);
    if (!byMonth.has(key)) {
      byMonth.set(key, {
        month: key,
        label: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
        bySegment: { tatuagem: 0, piercing: 0, coworking: 0, curso: 0 },
        total: 0,
      });
    }
    const entry = byMonth.get(key)!;
    entry.bySegment[l.segment] += l.amount;
    entry.total += l.amount;
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

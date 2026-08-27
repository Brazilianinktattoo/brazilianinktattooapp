import { rangeBounds } from "@/lib/date";
import { commissionRate, resolveClientIsOwn, salesCommissionRate } from "@/lib/commission";
import { createClient } from "@/lib/supabase/server";
import type { ClientOrigin } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ServiceCategory = "Tatuagem" | "Piercing" | "Outro";
export type ServiceLineKind = "Serviço" | "Venda de jóia";

export type ServiceReportFilters = {
  from: string;
  to: string;
  collaboratorId?: string;
  unitId?: string;
  serviceQuery?: string;
  clientQuery?: string;
  kind?: "servico" | "venda_joia";
};

export type ServiceReportLine = {
  comandaId: string;
  serviceId: string;
  date: string;
  unitId: string;
  unitName: string;
  collaboratorId: string;
  collaboratorName: string;
  category: ServiceCategory;
  kind: ServiceLineKind;
  clientName: string;
  description: string;
  price: number;
  commissionRate: number;
  commission: number;
};

type RawComandaRow = {
  id: string;
  closed_at: string | null;
  unit: { id: string; name: string } | null;
  collaborator: {
    id: string;
    full_name: string;
    role: string;
    commission_rate: number | null;
    commission_rate_sales: number | null;
  } | null;
  appointment:
    | {
        id: string;
        client_name: string;
        client_is_own: boolean;
        // appointment_id em anamnese_forms é unique, então o Supabase infere
        // relação um-pra-um e retorna objeto (ou null), não array.
        anamnese_forms: {
          client_origin: ClientOrigin | null;
          signed_at: string | null;
        } | null;
      }
    | null;
  comanda_services: { id: string; description: string; price: number }[];
  comanda_jewelry: { id: string; jewelry_name: string; value: number }[];
};

// Admin atua como tatuador (mesma comissão/categoria) e Chefe de Piercing
// atua como body piercer — pedido explícito pra eles também terem
// atendimentos próprios sem virar uma terceira categoria.
function categoryForRole(role: string | undefined): ServiceCategory {
  if (role === "tatuador" || role === "admin") return "Tatuagem";
  if (role === "piercer" || role === "chefe_piercing") return "Piercing";
  return "Outro";
}

export async function fetchServiceReportLines(
  supabase: SupabaseServerClient,
  filters: ServiceReportFilters
): Promise<ServiceReportLine[]> {
  const { start, end } = rangeBounds(filters.from, filters.to);

  const { data } = await supabase
    .from("comandas")
    .select(
      "id, closed_at, unit:units(id, name), collaborator:profiles!comandas_collaborator_id_fkey(id, full_name, role, commission_rate, commission_rate_sales), appointment:appointments!comandas_appointment_id_fkey(id, client_name, client_is_own, anamnese_forms(client_origin, signed_at)), comanda_services(id, description, price), comanda_jewelry(id, jewelry_name, value)"
    )
    .eq("status", "fechada")
    .gte("closed_at", start.toISOString())
    .lt("closed_at", end.toISOString())
    .returns<RawComandaRow[]>();

  let lines: ServiceReportLine[] = [];
  for (const c of data ?? []) {
    const unitName = c.unit?.name ?? "—";
    const category = categoryForRole(c.collaborator?.role);
    const anamnese = c.appointment?.anamnese_forms;
    const clientIsOwn = resolveClientIsOwn(
      c.appointment?.client_is_own ?? false,
      anamnese?.client_origin,
      anamnese?.signed_at
    );
    const isPiercingRole =
      c.collaborator?.role === "piercer" || c.collaborator?.role === "chefe_piercing";
    const rate = commissionRate(
      unitName,
      clientIsOwn,
      c.collaborator?.commission_rate,
      !isPiercingRole
    );
    for (const s of c.comanda_services ?? []) {
      lines.push({
        comandaId: c.id,
        serviceId: s.id,
        date: c.closed_at ?? "",
        unitId: c.unit?.id ?? "",
        unitName,
        collaboratorId: c.collaborator?.id ?? "",
        collaboratorName: c.collaborator?.full_name || "Sem nome",
        category,
        kind: "Serviço",
        clientName: c.appointment?.client_name ?? "",
        description: s.description,
        price: s.price,
        commissionRate: rate,
        commission: Math.round(s.price * rate * 100) / 100,
      });
    }
    // Venda de jóia usa comissão separada (commission_rate_sales), sem
    // regra automática por unidade/origem do cliente — mesma lógica já
    // usada no detalhe da comanda (lib/commission.ts).
    const salesRate = salesCommissionRate(c.collaborator?.commission_rate_sales);
    for (const j of c.comanda_jewelry ?? []) {
      lines.push({
        comandaId: c.id,
        serviceId: j.id,
        date: c.closed_at ?? "",
        unitId: c.unit?.id ?? "",
        unitName,
        collaboratorId: c.collaborator?.id ?? "",
        collaboratorName: c.collaborator?.full_name || "Sem nome",
        category,
        kind: "Venda de jóia",
        clientName: c.appointment?.client_name ?? "",
        description: j.jewelry_name,
        price: j.value,
        commissionRate: salesRate,
        commission: Math.round(j.value * salesRate * 100) / 100,
      });
    }
  }

  if (filters.collaboratorId) {
    lines = lines.filter((l) => l.collaboratorId === filters.collaboratorId);
  }
  if (filters.unitId) {
    lines = lines.filter((l) => l.unitId === filters.unitId);
  }
  if (filters.serviceQuery) {
    const q = filters.serviceQuery.toLowerCase();
    lines = lines.filter((l) => l.description.toLowerCase().includes(q));
  }
  if (filters.clientQuery) {
    const q = filters.clientQuery.toLowerCase();
    lines = lines.filter((l) => l.clientName.toLowerCase().includes(q));
  }
  if (filters.kind === "servico") {
    lines = lines.filter((l) => l.kind === "Serviço");
  } else if (filters.kind === "venda_joia") {
    lines = lines.filter((l) => l.kind === "Venda de jóia");
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));
  return lines;
}

export type ServiceReportSummary = {
  atendimentos: number;
  faturado: number;
  comissao: number;
};

export function summarizeLines(lines: ServiceReportLine[]): ServiceReportSummary {
  return {
    atendimentos: new Set(lines.map((l) => l.comandaId)).size,
    faturado: lines.reduce((s, l) => s + l.price, 0),
    comissao: lines.reduce((s, l) => s + l.commission, 0),
  };
}

export function summarizeServiceReport(lines: ServiceReportLine[]) {
  return {
    total: summarizeLines(lines),
    tatuagem: summarizeLines(lines.filter((l) => l.category === "Tatuagem")),
    piercing: summarizeLines(lines.filter((l) => l.category === "Piercing")),
  };
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function money(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function linesToCsv(lines: ServiceReportLine[]): string {
  const header = [
    "Data",
    "Unidade",
    "Colaborador",
    "Categoria",
    "Tipo",
    "Cliente",
    "Serviço",
    "Valor (R$)",
    "Comissão (R$)",
  ];
  const rows = lines.map((l) => [
    l.date ? new Date(l.date).toLocaleDateString("pt-BR") : "",
    l.unitName,
    l.collaboratorName,
    l.category,
    l.kind,
    l.clientName,
    l.description,
    money(l.price),
    money(l.commission),
  ]);
  return [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n");
}

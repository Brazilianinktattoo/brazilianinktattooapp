import { formatStudioDate, rangeBounds } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type BarraShoppingFilters = {
  from: string;
  to: string;
};

export type BarraShoppingLine = {
  comandaId: string;
  date: string;
  clientName: string;
  description: string;
  value: number;
};

export type BarraShoppingReport = {
  piercingServices: BarraShoppingLine[];
  tattooServices: BarraShoppingLine[];
  productSales: BarraShoppingLine[];
};

type RawComandaRow = {
  id: string;
  closed_at: string | null;
  unit: { name: string } | null;
  collaborator: { role: string } | null;
  appointment: { client_name: string } | null;
  comanda_services: { id: string; description: string; price: number }[];
  comanda_products: {
    id: string;
    quantity: number;
    unit_price: number;
    product: { name: string } | null;
  }[];
  comanda_jewelry: { id: string; jewelry_name: string; operation: string; value: number }[];
};

const OPERATION_LABEL: Record<string, string> = {
  aplicada: "Aplicação",
  trocada: "Troca",
  vendida: "Venda",
};

export async function fetchBarraShoppingReport(
  supabase: SupabaseServerClient,
  filters: BarraShoppingFilters
): Promise<BarraShoppingReport> {
  const { start, end } = rangeBounds(filters.from, filters.to);

  const { data } = await supabase
    .from("comandas")
    .select(
      "id, closed_at, unit:units(name), collaborator:profiles!comandas_collaborator_id_fkey(role), appointment:appointments!comandas_appointment_id_fkey(client_name), comanda_services(id, description, price), comanda_products(id, quantity, unit_price, product:products(name)), comanda_jewelry(id, jewelry_name, operation, value)"
    )
    .eq("status", "fechada")
    .gte("closed_at", start.toISOString())
    .lt("closed_at", end.toISOString())
    .returns<RawComandaRow[]>();

  const piercingServices: BarraShoppingLine[] = [];
  const tattooServices: BarraShoppingLine[] = [];
  const productSales: BarraShoppingLine[] = [];

  for (const c of data ?? []) {
    const unitName = c.unit?.name ?? "";
    if (!unitName.toLowerCase().includes("barra")) continue;

    const date = c.closed_at ?? "";
    const clientName = c.appointment?.client_name ?? "";
    const role = c.collaborator?.role;

    for (const s of c.comanda_services ?? []) {
      const line: BarraShoppingLine = {
        comandaId: c.id,
        date,
        clientName,
        description: s.description,
        value: s.price,
      };
      if (role === "piercer") piercingServices.push(line);
      else if (role === "tatuador") tattooServices.push(line);
    }

    for (const p of c.comanda_products ?? []) {
      productSales.push({
        comandaId: c.id,
        date,
        clientName,
        description: p.product?.name ?? "Produto",
        value: p.quantity * p.unit_price,
      });
    }

    for (const j of c.comanda_jewelry ?? []) {
      productSales.push({
        comandaId: c.id,
        date,
        clientName,
        description: `${j.jewelry_name} (${OPERATION_LABEL[j.operation] ?? j.operation})`,
        value: j.value,
      });
    }
  }

  const byDate = (a: BarraShoppingLine, b: BarraShoppingLine) =>
    a.date.localeCompare(b.date);
  piercingServices.sort(byDate);
  tattooServices.sort(byDate);
  productSales.sort(byDate);

  return { piercingServices, tattooServices, productSales };
}

export function subtotal(lines: BarraShoppingLine[]): number {
  return lines.reduce((s, l) => s + l.value, 0);
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function money(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function barraShoppingToCsv(report: BarraShoppingReport): string {
  const header = ["Bloco", "Data", "Cliente", "Descrição", "Valor (R$)"];
  const rows: string[][] = [];

  const blocks: [string, BarraShoppingLine[]][] = [
    ["Serviços de piercing", report.piercingServices],
    ["Serviços de tatuagem", report.tattooServices],
    ["Vendas de produtos/jóias", report.productSales],
  ];

  for (const [label, lines] of blocks) {
    for (const l of lines) {
      rows.push([
        label,
        l.date ? formatStudioDate(l.date) : "",
        l.clientName,
        l.description,
        money(l.value),
      ]);
    }
    rows.push([label, "", "", "Subtotal", money(subtotal(lines))]);
  }

  return [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n");
}

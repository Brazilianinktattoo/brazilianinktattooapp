import { createClient } from "@/lib/supabase/server";
import { STUDIO_OFFSET, dateParamFromISO } from "@/lib/date";

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PeriodType = "dia" | "semana" | "mes" | "ano";

export type DesempenhoFilters = {
  from: Date;
  to: Date;
  unitId?: string;
  collaboratorId?: string;
};

export type LojaStat = {
  unitId: string;
  unitName: string;
  faturamento: number;
  comandas: number;
  comandasFechadas: number;
};

export type ColaboradorStat = {
  collaboratorId: string;
  collaboratorName: string;
  role: string;
  faturamento: number;
  comandas: number;
  servicos: number;
};

export type ServicoStat = {
  description: string;
  quantidade: number;
  faturamento: number;
};

export type JoiaStat = {
  jewelryName: string;
  quantidade: number;
  faturamento: number;
};

export type DiaStat = {
  date: string;
  comandas: number;
};

export type DiaSemanaStat = {
  weekday: number;
  label: string;
  comandas: number;
};

export type DesempenhoData = {
  porLoja: LojaStat[];
  porColaborador: ColaboradorStat[];
  porServico: ServicoStat[];
  porJoia: JoiaStat[];
  porDia: DiaStat[];
  porDiaSemana: DiaSemanaStat[];
  fichasPreenchidas: number;
  totais: {
    faturamento: number;
    faturamentoServicos: number;
    faturamentoJoias: number;
    faturamentoProdutos: number;
    comandas: number;
    comandasFechadas: number;
    servicos: number;
    joias: number;
  };
};

type ComandaRow = {
  id: string;
  created_at: string;
  closed_at: string | null;
  status: string;
  unit: { id: string; name: string } | null;
  collaborator: { id: string; full_name: string; role: string } | null;
  comanda_services: { description: string; price: number }[];
  comanda_jewelry: { jewelry_name: string; value: number }[];
  comanda_products: { quantity: number; unit_price: number }[];
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
};

export async function fetchDesempenho(
  supabase: SupabaseServerClient,
  filters: DesempenhoFilters
): Promise<DesempenhoData> {
  let query = supabase
    .from("comandas")
    .select(
      "id, created_at, closed_at, status, unit:units(id, name), collaborator:profiles!comandas_collaborator_id_fkey(id, full_name, role), comanda_services(description, price), comanda_jewelry(jewelry_name, value), comanda_products(quantity, unit_price)"
    )
    .gte("created_at", filters.from.toISOString())
    .lt("created_at", filters.to.toISOString());

  if (filters.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters.collaboratorId) query = query.eq("collaborator_id", filters.collaboratorId);

  const { data } = await query.returns<ComandaRow[]>();
  const comandas = data ?? [];

  const lojaMap = new Map<string, LojaStat>();
  const colaboradorMap = new Map<string, ColaboradorStat>();
  const servicoMap = new Map<string, ServicoStat>();
  const joiaMap = new Map<string, JoiaStat>();
  const diaMap = new Map<string, number>();
  const diaSemanaMap = new Map<number, number>();

  let faturamentoServicos = 0;
  let faturamentoJoias = 0;
  let faturamentoProdutos = 0;
  let servicosCount = 0;
  let joiasCount = 0;
  let comandasFechadas = 0;

  for (const c of comandas) {
    const isFechada = c.status === "fechada";
    if (isFechada) comandasFechadas++;

    const servicesTotal = c.comanda_services.reduce((s, i) => s + i.price, 0);
    const jewelryTotal = c.comanda_jewelry.reduce((s, i) => s + i.value, 0);
    const productsTotal = c.comanda_products.reduce(
      (s, i) => s + i.quantity * i.unit_price,
      0
    );
    const comandaTotal = servicesTotal + jewelryTotal + productsTotal;

    // Faturamento só entra pra comanda fechada — comanda aberta ainda não
    // tem valor definitivo (pode mudar até o fechamento).
    if (isFechada) {
      faturamentoServicos += servicesTotal;
      faturamentoJoias += jewelryTotal;
      faturamentoProdutos += productsTotal;
    }

    if (c.unit) {
      const entry = lojaMap.get(c.unit.id) ?? {
        unitId: c.unit.id,
        unitName: c.unit.name,
        faturamento: 0,
        comandas: 0,
        comandasFechadas: 0,
      };
      entry.comandas += 1;
      if (isFechada) {
        entry.comandasFechadas += 1;
        entry.faturamento += comandaTotal;
      }
      lojaMap.set(c.unit.id, entry);
    }

    if (c.collaborator) {
      const entry = colaboradorMap.get(c.collaborator.id) ?? {
        collaboratorId: c.collaborator.id,
        collaboratorName: c.collaborator.full_name || "Sem nome",
        role: ROLE_LABEL[c.collaborator.role] ?? c.collaborator.role,
        faturamento: 0,
        comandas: 0,
        servicos: 0,
      };
      entry.comandas += 1;
      if (isFechada) {
        entry.faturamento += comandaTotal;
        entry.servicos += c.comanda_services.length;
      }
      colaboradorMap.set(c.collaborator.id, entry);
    }

    if (isFechada) {
      for (const s of c.comanda_services) {
        const entry = servicoMap.get(s.description) ?? {
          description: s.description,
          quantidade: 0,
          faturamento: 0,
        };
        entry.quantidade += 1;
        entry.faturamento += s.price;
        servicoMap.set(s.description, entry);
        servicosCount += 1;
      }

      for (const j of c.comanda_jewelry) {
        const entry = joiaMap.get(j.jewelry_name) ?? {
          jewelryName: j.jewelry_name,
          quantidade: 0,
          faturamento: 0,
        };
        entry.quantidade += 1;
        entry.faturamento += j.value;
        joiaMap.set(j.jewelry_name, entry);
        joiasCount += 1;
      }
    }

    const day = dateParamFromISO(c.created_at);
    diaMap.set(day, (diaMap.get(day) ?? 0) + 1);

    const weekday = new Date(`${day}T12:00:00${STUDIO_OFFSET}`).getUTCDay();
    diaSemanaMap.set(weekday, (diaSemanaMap.get(weekday) ?? 0) + 1);
  }

  const { count: fichasPreenchidas } = await supabase
    .from("anamnese_forms")
    .select("id", { count: "exact", head: true })
    .gte("signed_at", filters.from.toISOString())
    .lt("signed_at", filters.to.toISOString());

  return {
    porLoja: Array.from(lojaMap.values()).sort((a, b) => b.faturamento - a.faturamento),
    porColaborador: Array.from(colaboradorMap.values()).sort(
      (a, b) => b.faturamento - a.faturamento
    ),
    porServico: Array.from(servicoMap.values()).sort((a, b) => b.quantidade - a.quantidade),
    porJoia: Array.from(joiaMap.values()).sort((a, b) => b.quantidade - a.quantidade),
    porDia: Array.from(diaMap.entries())
      .map(([date, count]) => ({ date, comandas: count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    porDiaSemana: WEEKDAY_LABELS.map((label, weekday) => ({
      weekday,
      label,
      comandas: diaSemanaMap.get(weekday) ?? 0,
    })).sort((a, b) => b.comandas - a.comandas),
    fichasPreenchidas: fichasPreenchidas ?? 0,
    totais: {
      faturamento: faturamentoServicos + faturamentoJoias + faturamentoProdutos,
      faturamentoServicos,
      faturamentoJoias,
      faturamentoProdutos,
      comandas: comandas.length,
      comandasFechadas,
      servicos: servicosCount,
      joias: joiasCount,
    },
  };
}

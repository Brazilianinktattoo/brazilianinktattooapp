import { createClient } from "@/lib/supabase/server";
import { dayBounds, monthBounds, monthOf, shiftDate, todayParam } from "@/lib/date";
import { fetchFinanceLines, summarizeFinanceLines } from "@/lib/reports/fechamento";
import type { Client, FixedBill, Product, Profile, Unit } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DUE_SOON_DAYS = 7;

export type BirthdayPerson = { id: string; name: string; kind: "colaborador" | "cliente" };

function monthDay(dateStr: string) {
  return dateStr.slice(5, 10); // "MM-DD"
}

async function fetchBirthdaysToday(supabase: SupabaseServerClient): Promise<BirthdayPerson[]> {
  const today = monthDay(todayParam());

  const [{ data: profiles }, { data: clients }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, birthday")
      .not("birthday", "is", null)
      .eq("active", true)
      .returns<Pick<Profile, "id" | "full_name" | "birthday">[]>(),
    supabase
      .from("clients")
      .select("id, full_name, birthday")
      .not("birthday", "is", null)
      .returns<Pick<Client, "id" | "full_name" | "birthday">[]>(),
  ]);

  const people: BirthdayPerson[] = [];
  for (const p of profiles ?? []) {
    if (p.birthday && monthDay(p.birthday) === today) {
      people.push({ id: p.id, name: p.full_name || "Sem nome", kind: "colaborador" });
    }
  }
  for (const c of clients ?? []) {
    if (c.birthday && monthDay(c.birthday) === today) {
      people.push({ id: c.id, name: c.full_name, kind: "cliente" });
    }
  }
  return people;
}

export type DueBill = Pick<FixedBill, "id" | "name" | "amount" | "due_date">;

async function fetchBillsDueSoon(supabase: SupabaseServerClient): Promise<DueBill[]> {
  const today = todayParam();
  const limit = shiftDate(today, DUE_SOON_DAYS);
  const { data } = await supabase
    .from("fixed_bills")
    .select("id, name, amount, due_date")
    .is("paid_date", null)
    .not("due_date", "is", null)
    .lte("due_date", limit)
    .order("due_date", { ascending: true })
    .returns<DueBill[]>();

  // Inclui vencidas (due_date < hoje) junto com as próximas — ambas
  // precisam de atenção imediata do admin.
  return data ?? [];
}

export type LowStockProduct = Pick<Product, "id" | "name" | "quantity" | "min_stock">;

async function fetchLowStock(supabase: SupabaseServerClient): Promise<LowStockProduct[]> {
  const { data } = await supabase
    .from("products")
    .select("id, name, quantity, min_stock")
    .eq("active", true)
    .returns<LowStockProduct[]>();

  return (data ?? [])
    .filter((p) => p.quantity <= p.min_stock)
    .sort((a, b) => a.quantity - b.quantity);
}

async function fetchTodayAppointmentsCount(supabase: SupabaseServerClient): Promise<number> {
  const { start, end } = dayBounds(todayParam());
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmado")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());
  return count ?? 0;
}

export type UnitAppointmentCount = { unitId: string; unitName: string; count: number };

async function fetchMonthAppointmentsByUnit(
  supabase: SupabaseServerClient
): Promise<UnitAppointmentCount[]> {
  const { start, end } = monthBounds(monthOf(todayParam()));
  const [{ data: units }, { data: appts }] = await Promise.all([
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    supabase
      .from("appointments")
      .select("unit_id")
      .eq("status", "confirmado")
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .returns<{ unit_id: string }[]>(),
  ]);

  const countByUnit = new Map<string, number>();
  for (const a of appts ?? []) {
    countByUnit.set(a.unit_id, (countByUnit.get(a.unit_id) ?? 0) + 1);
  }

  return (units ?? []).map((u) => ({
    unitId: u.id,
    unitName: u.name,
    count: countByUnit.get(u.id) ?? 0,
  }));
}

export async function fetchDashboardData(supabase: SupabaseServerClient) {
  const today = todayParam();

  const [
    birthdaysToday,
    billsDueSoon,
    lowStock,
    todayAppointments,
    monthByUnit,
    todayFinanceLines,
  ] = await Promise.all([
    fetchBirthdaysToday(supabase),
    fetchBillsDueSoon(supabase),
    fetchLowStock(supabase),
    fetchTodayAppointmentsCount(supabase),
    fetchMonthAppointmentsByUnit(supabase),
    fetchFinanceLines(supabase, { from: today, to: today }),
  ]);

  return {
    birthdaysToday,
    billsDueSoon,
    lowStock,
    todayAppointments,
    monthByUnit,
    todaySummary: summarizeFinanceLines(todayFinanceLines),
  };
}

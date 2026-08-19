import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/lib/types/database";
import {
  STUDIO_TZ,
  formatMonthLabel,
  monthBounds,
  monthGridDays,
  monthOf,
  shiftMonth,
  todayParam,
} from "@/lib/date";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function MonthView({ monthParam }: { monthParam: string }) {
  const { start, end } = monthBounds(monthParam);

  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select("starts_at, status")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .returns<Pick<Appointment, "starts_at" | "status">[]>();

  const countByDay = new Map<string, { total: number; ativos: number }>();
  for (const appt of appointments ?? []) {
    const day = new Date(appt.starts_at).toLocaleDateString("en-CA", {
      timeZone: STUDIO_TZ,
    });
    const entry = countByDay.get(day) ?? { total: 0, ativos: 0 };
    entry.total += 1;
    if (appt.status !== "cancelado") entry.ativos += 1;
    countByDay.set(day, entry);
  }

  const grid = monthGridDays(monthParam);
  const today = todayParam();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Agenda — Mês</h1>
          <p className="text-neutral-400 capitalize">
            {formatMonthLabel(monthParam)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda?view=mes&month=${shiftMonth(monthParam, -1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`/agenda?view=mes&month=${monthOf(todayParam())}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`/agenda?view=mes&month=${shiftMonth(monthParam, 1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-neutral-500">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {grid.map((dayParam) => {
          const inMonth = dayParam.slice(0, 7) === monthParam;
          const stats = countByDay.get(dayParam);
          const isToday = dayParam === today;

          return (
            <Link
              key={dayParam}
              href={`/agenda?date=${dayParam}`}
              className={`flex min-h-20 flex-col gap-1 rounded-lg border p-2 text-left transition hover:border-gold-soft ${
                inMonth
                  ? "border-neutral-800 bg-neutral-900/40"
                  : "border-neutral-900 bg-neutral-950/40 opacity-40"
              } ${isToday ? "border-gold" : ""}`}
            >
              <span
                className={`text-sm ${
                  inMonth ? "text-neutral-200" : "text-neutral-600"
                }`}
              >
                {Number(dayParam.slice(8, 10))}
              </span>
              {stats && stats.total > 0 && (
                <span className="self-start rounded-full bg-gold-soft/20 px-1.5 py-0.5 text-[11px] text-gold">
                  {stats.ativos} agend.
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

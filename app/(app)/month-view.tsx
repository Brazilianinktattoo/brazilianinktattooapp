import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/lib/types/database";
import { collaboratorColor } from "@/lib/collaborator-color";
import {
  STUDIO_TZ,
  formatMonthLabel,
  monthBounds,
  monthGridDays,
  monthOf,
  shiftMonth,
  todayParam,
} from "@/lib/date";

const MAX_DOTS_PER_DAY = 6;

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function MonthView({
  monthParam,
  basePath = "/agenda",
  title = "Agenda",
  macaOnly = false,
}: {
  monthParam: string;
  basePath?: string;
  title?: string;
  macaOnly?: boolean;
}) {
  const { start, end } = monthBounds(monthParam);

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("starts_at, status, collaborator_id, collaborator:profiles(full_name)")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());
  if (macaOnly) query = query.not("maca_id", "is", null);
  const { data: appointments } = await query.returns<
    (Pick<Appointment, "starts_at" | "status" | "collaborator_id"> & {
      collaborator: { full_name: string } | null;
    })[]
  >();

  const countByDay = new Map<string, { total: number; ativos: number }>();
  const collaboratorsByDay = new Map<
    string,
    Map<string, { id: string; name: string }>
  >();
  for (const appt of appointments ?? []) {
    const day = new Date(appt.starts_at).toLocaleDateString("en-CA", {
      timeZone: STUDIO_TZ,
    });
    const entry = countByDay.get(day) ?? { total: 0, ativos: 0 };
    entry.total += 1;
    if (appt.status !== "cancelado") entry.ativos += 1;
    countByDay.set(day, entry);

    if (appt.status !== "cancelado") {
      const people = collaboratorsByDay.get(day) ?? new Map();
      people.set(appt.collaborator_id, {
        id: appt.collaborator_id,
        name: appt.collaborator?.full_name ?? "",
      });
      collaboratorsByDay.set(day, people);
    }
  }

  const grid = monthGridDays(monthParam);
  const today = todayParam();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title} — Mês</h1>
          <p className="text-neutral-400 capitalize">
            {formatMonthLabel(monthParam)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}?view=mes&month=${shiftMonth(monthParam, -1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`${basePath}?view=mes&month=${monthOf(todayParam())}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`${basePath}?view=mes&month=${shiftMonth(monthParam, 1)}`}
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
          const people = Array.from(collaboratorsByDay.get(dayParam)?.values() ?? []);

          return (
            <Link
              key={dayParam}
              href={`${basePath}?date=${dayParam}`}
              title={people.map((p) => p.name).filter(Boolean).join(", ")}
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
              {people.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1">
                  {people.slice(0, MAX_DOTS_PER_DAY).map((p) => (
                    <span
                      key={p.id}
                      className={`h-2 w-2 rounded-full ${collaboratorColor(p.id).dot}`}
                    />
                  ))}
                  {people.length > MAX_DOTS_PER_DAY && (
                    <span className="text-[10px] text-neutral-500">
                      +{people.length - MAX_DOTS_PER_DAY}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

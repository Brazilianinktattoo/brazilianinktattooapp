import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/lib/types/database";
import { getStaffColorMap, resolveCollaboratorColor } from "@/lib/collaborator-color";
import { STUDIO_TZ, monthOf, shiftYear, todayParam, yearBounds } from "@/lib/date";

const MAX_NAMES_PER_MONTH = 8;

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export async function YearView({
  yearParam,
  basePath = "/agenda",
  title = "Agenda",
  macaOnly = false,
}: {
  yearParam: string;
  basePath?: string;
  title?: string;
  macaOnly?: boolean;
}) {
  const { start, end } = yearBounds(yearParam);

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("starts_at, status, collaborator_id, collaborator:profiles(full_name)")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());
  if (macaOnly) query = query.not("maca_id", "is", null);
  const [{ data: appointments }, staffColorMap] = await Promise.all([
    query.returns<
      (Pick<Appointment, "starts_at" | "status" | "collaborator_id"> & {
        collaborator: { full_name: string } | null;
      })[]
    >(),
    getStaffColorMap(supabase),
  ]);

  const countByMonth = new Map<number, { total: number; ativos: number }>();
  const collaboratorsByMonth = new Map<
    number,
    Map<string, { id: string; name: string }>
  >();
  for (const appt of appointments ?? []) {
    const monthStr = new Date(appt.starts_at).toLocaleDateString("en-CA", {
      timeZone: STUDIO_TZ,
    });
    const monthIndex = Number(monthStr.slice(5, 7)) - 1;
    const entry = countByMonth.get(monthIndex) ?? { total: 0, ativos: 0 };
    entry.total += 1;
    if (appt.status !== "cancelado") entry.ativos += 1;
    countByMonth.set(monthIndex, entry);

    if (appt.status !== "cancelado") {
      const people = collaboratorsByMonth.get(monthIndex) ?? new Map();
      people.set(appt.collaborator_id, {
        id: appt.collaborator_id,
        name: appt.collaborator?.full_name ?? "",
      });
      collaboratorsByMonth.set(monthIndex, people);
    }
  }

  const currentMonth = monthOf(todayParam());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title} — Ano</h1>
          <p className="text-neutral-400">{yearParam}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}?view=ano&year=${shiftYear(yearParam, -1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`${basePath}?view=ano&year=${todayParam().slice(0, 4)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`${basePath}?view=ano&year=${shiftYear(yearParam, 1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MONTH_LABELS.map((label, i) => {
          const monthValue = `${yearParam}-${String(i + 1).padStart(2, "0")}`;
          const stats = countByMonth.get(i);
          const isCurrentMonth = monthValue === currentMonth;
          const people = Array.from(collaboratorsByMonth.get(i)?.values() ?? []);

          return (
            <Link
              key={label}
              href={`${basePath}?view=mes&month=${monthValue}`}
              className={`rounded-xl border bg-neutral-900/40 p-4 transition hover:border-gold-soft ${
                isCurrentMonth ? "border-gold" : "border-neutral-800"
              }`}
            >
              <div className="text-neutral-100">{label}</div>
              <div className="mt-2 text-2xl font-semibold text-gold">
                {stats?.ativos ?? 0}
              </div>
              <div className="text-xs text-neutral-500">agendamentos</div>
              {people.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {people.slice(0, MAX_NAMES_PER_MONTH).map((p) => {
                    const color = resolveCollaboratorColor(p.id, staffColorMap);
                    return (
                      <span
                        key={p.id}
                        style={{ backgroundColor: color.bg, color: color.text }}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        {p.name.split(" ")[0] || "—"}
                      </span>
                    );
                  })}
                  {people.length > MAX_NAMES_PER_MONTH && (
                    <span className="text-[10px] text-neutral-500">
                      +{people.length - MAX_NAMES_PER_MONTH}
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

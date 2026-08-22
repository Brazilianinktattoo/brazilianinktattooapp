import { STUDIO_OFFSET, dateParamFromISO, shiftDate } from "@/lib/date";

export type FreeRange = { startISO: string; endISO: string };
export type FreeDay = { date: string; ranges: FreeRange[] };

type BusyRange = { starts_at: string; ends_at: string };

// Janelas livres de um único dia, dado o horário de funcionamento
// ("HH:MM") e os intervalos já ocupados. Domingo sempre devolve []
// (estúdio fechado) — mesma regra da trigger enforce_appointment_rules.
export function freeRangesForDay(
  dateParam: string,
  opensAt: string,
  closesAt: string,
  busy: BusyRange[]
): FreeRange[] {
  const dow = new Date(`${dateParam}T12:00:00${STUDIO_OFFSET}`).getUTCDay();
  if (dow === 0) return [];

  const dayStart = new Date(`${dateParam}T${opensAt.slice(0, 5)}:00${STUDIO_OFFSET}`);
  const dayEnd = new Date(`${dateParam}T${closesAt.slice(0, 5)}:00${STUDIO_OFFSET}`);
  if (dayEnd <= dayStart) return [];

  const busyToday = busy
    .map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }))
    .filter((b) => b.end > dayStart && b.start < dayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const free: FreeRange[] = [];
  let cursor = dayStart;
  for (const b of busyToday) {
    const busyStart = b.start < dayStart ? dayStart : b.start;
    const busyEnd = b.end > dayEnd ? dayEnd : b.end;
    if (busyStart.getTime() > cursor.getTime()) {
      free.push({ startISO: cursor.toISOString(), endISO: busyStart.toISOString() });
    }
    if (busyEnd.getTime() > cursor.getTime()) cursor = busyEnd;
  }
  if (cursor.getTime() < dayEnd.getTime()) {
    free.push({ startISO: cursor.toISOString(), endISO: dayEnd.toISOString() });
  }
  return free;
}

// Mesma coisa, dia a dia, por uma janela [fromISO, toISO] (ex: o período
// de um acesso de coworking) — usado pra mostrar ao visitante só os
// horários realmente livres pra agendar.
export function freeRangesInWindow(
  fromISO: string,
  toISO: string,
  opensAt: string,
  closesAt: string,
  busy: BusyRange[]
): FreeDay[] {
  const windowStart = new Date(fromISO);
  const windowEnd = new Date(toISO);
  if (windowEnd <= windowStart) return [];

  const lastDay = dateParamFromISO(toISO);
  const days: FreeDay[] = [];
  let cursor = dateParamFromISO(fromISO);
  let guard = 0;

  while (cursor <= lastDay && guard < 60) {
    const ranges = freeRangesForDay(cursor, opensAt, closesAt, busy)
      .map((r) => {
        const start = new Date(r.startISO);
        const end = new Date(r.endISO);
        return {
          startISO: (start < windowStart ? windowStart : start).toISOString(),
          endISO: (end > windowEnd ? windowEnd : end).toISOString(),
        };
      })
      .filter((r) => new Date(r.startISO) < new Date(r.endISO));

    if (ranges.length > 0) days.push({ date: cursor, ranges });
    cursor = shiftDate(cursor, 1);
    guard++;
  }

  return days;
}

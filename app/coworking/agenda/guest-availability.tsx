import type { FreeDay } from "@/lib/business-hours";

function formatDate(dateParam: string) {
  return new Date(`${dateParam}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Mostra só os horários realmente livres da maca no período do acesso —
// nunca os já ocupados por tatuadores ou outros visitantes, nem domingo,
// nem fora do horário de funcionamento da unidade.
export function GuestAvailability({ days }: { days: FreeDay[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-semibold text-white">Horários livres da sua maca</h2>
      {days.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum horário livre no seu período de acesso.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {days.map((day) => (
            <div key={day.date} className="flex flex-wrap items-baseline gap-2 text-sm">
              <span className="w-24 shrink-0 capitalize text-neutral-300">
                {formatDate(day.date)}
              </span>
              <div className="flex flex-wrap gap-2">
                {day.ranges.map((r, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs text-green-400"
                  >
                    {formatTime(r.startISO)} – {formatTime(r.endISO)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-500">
        Domingo e horários fora do funcionamento não aparecem aqui — nem dá
        pra agendar neles.
      </p>
    </div>
  );
}

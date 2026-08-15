// Estúdio é sempre em São Paulo — âncora fixa evita bugs de "hoje" quando o
// servidor roda em outro fuso (ex: UTC em produção). Seguro porque o Brasil
// não tem mais horário de verão (offset -03:00 é constante o ano todo).
export const STUDIO_TZ = "America/Sao_Paulo";
const STUDIO_OFFSET = "-03:00";

export function todayParam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TZ }).format(
    new Date()
  );
}

export function dayBounds(dateParam: string) {
  const start = new Date(`${dateParam}T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${dateParam}T00:00:00${STUDIO_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function formatDateLabel(dateParam: string) {
  return new Date(`${dateParam}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: STUDIO_TZ,
  });
}

export function shiftDate(dateParam: string, days: number) {
  const d = new Date(`${dateParam}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

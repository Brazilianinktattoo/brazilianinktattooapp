// Estúdio é sempre em São Paulo — âncora fixa evita bugs de "hoje" quando o
// servidor roda em outro fuso (ex: UTC em produção). Seguro porque o Brasil
// não tem mais horário de verão (offset -03:00 é constante o ano todo).
export const STUDIO_TZ = "America/Sao_Paulo";
export const STUDIO_OFFSET = "-03:00";

// Converte um ISO qualquer pro formato que <input type="datetime-local">
// espera ("YYYY-MM-DDTHH:mm"), já no fuso do estúdio — inverso do padrão
// `${value}:00${STUDIO_OFFSET}` usado ao salvar esses inputs.
export function toStudioLocalInputValue(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

export function todayParam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TZ }).format(
    new Date()
  );
}

// Formata um instante (timestamptz) na data/hora local do estúdio —
// toLocaleDateString/toLocaleString sem `timeZone` usam o fuso do runtime
// (UTC no servidor), o que atrasa/adianta a data pra qualquer horário entre
// 21h e 23h59 (fuso do estúdio), quando já é o dia seguinte em UTC. Usado
// pra qualquer timestamp real (closed_at, created_at, starts_at) — não pra
// datas "YYYY-MM-DD" puras, que já usam a âncora meio-dia UTC (seguras por
// natureza, ver formatDateLabel/formatWeekLabel/formatMonthLabel).
export function formatStudioDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
}

export function formatStudioDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: STUDIO_TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "YYYY-MM-DD" do dia local (fuso do estúdio) em que um instante cai —
// mesma técnica do todayParam(), mas pra um instante arbitrário.
export function dateParamFromISO(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TZ }).format(
    new Date(iso)
  );
}

export function dayBounds(dateParam: string) {
  const start = new Date(`${dateParam}T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${dateParam}T00:00:00${STUDIO_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

// [fromParam, toParam] inclusivo dos dois extremos.
export function rangeBounds(fromParam: string, toParam: string) {
  const start = new Date(`${fromParam}T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${toParam}T00:00:00${STUDIO_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function monthStartParam(dateParam: string = todayParam()) {
  return `${dateParam.slice(0, 7)}-01`;
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

// Domingo (dia 0) da semana em que dateParam cai — mesma convenção de
// "semana começa domingo" usada em monthGridDays.
export function weekStartParam(dateParam: string) {
  const d = new Date(`${dateParam}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export function weekBounds(dateParam: string) {
  const startParam = weekStartParam(dateParam);
  const start = new Date(`${startParam}T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${startParam}T00:00:00${STUDIO_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export function shiftWeek(dateParam: string, weeks: number) {
  return shiftDate(dateParam, weeks * 7);
}

export function formatWeekLabel(dateParam: string) {
  const startParam = weekStartParam(dateParam);
  const endParam = shiftDate(startParam, 6);
  const fmt = (p: string) =>
    new Date(`${p}T12:00:00Z`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: STUDIO_TZ,
    });
  return `${fmt(startParam)} – ${fmt(endParam)}`;
}

// "YYYY-MM-DD" -> "YYYY-MM" / "YYYY" — usado pra achar o mês/ano corrente
// ao entrar nas visões de agenda por mês/ano.
export function monthOf(dateParam: string) {
  return dateParam.slice(0, 7);
}

export function yearOf(dateParam: string) {
  return dateParam.slice(0, 4);
}

export function monthBounds(monthParam: string) {
  const start = new Date(`${monthParam}-01T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${monthParam}-01T00:00:00${STUDIO_OFFSET}`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export function yearBounds(yearParam: string) {
  const start = new Date(`${yearParam}-01-01T00:00:00${STUDIO_OFFSET}`);
  const end = new Date(`${yearParam}-01-01T00:00:00${STUDIO_OFFSET}`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start, end };
}

export function shiftMonth(monthParam: string, months: number) {
  const [y, m] = monthParam.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftYear(yearParam: string, years: number) {
  return String(Number(yearParam) + years);
}

export function formatMonthLabel(monthParam: string) {
  return new Date(`${monthParam}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: STUDIO_TZ,
  });
}

// Dias do grid do calendário mensal (semana começa domingo), completando
// com dias dos meses vizinhos até fechar 6 semanas — puro cálculo de
// calendário, não representa nenhum instante real (por isso UTC simples).
export function monthGridDays(monthParam: string): string[] {
  const [y, m] = monthParam.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

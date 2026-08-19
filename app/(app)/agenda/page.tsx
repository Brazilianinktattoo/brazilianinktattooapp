import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { monthOf, todayParam, yearOf } from "@/lib/date";
import { DayView } from "../day-view";
import { MonthView } from "../month-view";
import { YearView } from "../year-view";

type AgendaViewKey = "dia" | "mes" | "ano";

// Home do Admin virou o Dashboard — a agenda com as visões dia/mês/ano
// mora aqui agora. Tatuador/Body Piercer também usam essa rota (pra ver o
// estúdio inteiro em mês/ano) — a edição de cada linha continua restrita
// a quem é dono do agendamento ou admin (ver day-view.tsx), então não é
// preciso nenhuma checagem extra aqui.
export default async function AgendaPage(props: PageProps<"/agenda">) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireProfile();
  if (!["admin", "tatuador", "piercer"].includes(profile.role)) redirect("/");

  const requestedView =
    typeof searchParams.view === "string" ? searchParams.view : "dia";
  const view: AgendaViewKey =
    requestedView === "mes" || requestedView === "ano" ? requestedView : "dia";

  const dateParam =
    typeof searchParams.date === "string" ? searchParams.date : todayParam();
  const monthParam =
    typeof searchParams.month === "string"
      ? searchParams.month
      : monthOf(dateParam);
  const yearParam =
    typeof searchParams.year === "string" ? searchParams.year : yearOf(dateParam);

  const tabs: { key: AgendaViewKey; label: string; href: string }[] = [
    { key: "dia", label: "Dia", href: `/agenda?view=dia&date=${dateParam}` },
    { key: "mes", label: "Mês", href: `/agenda?view=mes&month=${monthParam}` },
    { key: "ano", label: "Ano", href: `/agenda?view=ano&year=${yearParam}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              view === tab.key
                ? "border-gold text-gold"
                : "border-neutral-700 text-neutral-400 hover:border-gold-soft hover:text-gold"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {view === "mes" ? (
        <MonthView monthParam={monthParam} />
      ) : view === "ano" ? (
        <YearView yearParam={yearParam} />
      ) : (
        <DayView dateParam={dateParam} user={user} profile={profile} basePath="/agenda" />
      )}
    </div>
  );
}

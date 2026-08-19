import Link from "next/link";
import { blockChefePiercing, requireProfile } from "@/lib/auth";
import { monthOf, todayParam, yearOf } from "@/lib/date";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { YearView } from "./year-view";

type AgendaViewKey = "dia" | "mes" | "ano";

export default async function AgendaPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireProfile();
  await blockChefePiercing(profile);

  const isAdmin = profile.role === "admin";
  const requestedView =
    typeof searchParams.view === "string" ? searchParams.view : "dia";
  // Só o Admin tem as visões de mês/ano — os demais sempre caem no dia,
  // mesmo que o parâmetro venha na URL.
  const view: AgendaViewKey =
    isAdmin && (requestedView === "mes" || requestedView === "ano")
      ? requestedView
      : "dia";

  const dateParam =
    typeof searchParams.date === "string" ? searchParams.date : todayParam();
  const monthParam =
    typeof searchParams.month === "string"
      ? searchParams.month
      : monthOf(dateParam);
  const yearParam =
    typeof searchParams.year === "string" ? searchParams.year : yearOf(dateParam);

  const tabs: { key: AgendaViewKey; label: string; href: string }[] = [
    { key: "dia", label: "Dia", href: `/?view=dia&date=${dateParam}` },
    { key: "mes", label: "Mês", href: `/?view=mes&month=${monthParam}` },
    { key: "ano", label: "Ano", href: `/?view=ano&year=${yearParam}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {isAdmin && (
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
      )}

      {view === "mes" ? (
        <MonthView monthParam={monthParam} />
      ) : view === "ano" ? (
        <YearView yearParam={yearParam} />
      ) : (
        <DayView dateParam={dateParam} user={user} profile={profile} />
      )}
    </div>
  );
}

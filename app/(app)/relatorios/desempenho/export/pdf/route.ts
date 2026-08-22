import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayParam } from "@/lib/date";
import { fetchDesempenho, periodBounds, type PeriodType } from "@/lib/reports/desempenho";
import { renderDesempenhoPdf } from "@/lib/reports/desempenho-pdf";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const sp = request.nextUrl.searchParams;
  const requestedPeriod = sp.get("period") ?? "";
  const period: PeriodType = (["dia", "semana", "mes", "ano"] as const).includes(
    requestedPeriod as PeriodType
  )
    ? (requestedPeriod as PeriodType)
    : "mes";
  const dateParam = sp.get("date") || todayParam();
  const unitId = sp.get("unit_id") || undefined;
  const collaboratorId = sp.get("collaborator_id") || undefined;

  const { start, end, label: periodLabel } = periodBounds(period, dateParam);

  const supabase = await createClient();
  const [{ data: unit }, { data: collaborator }, data] = await Promise.all([
    unitId
      ? supabase.from("units").select("name").eq("id", unitId).maybeSingle()
      : Promise.resolve({ data: null }),
    collaboratorId
      ? supabase.from("profiles").select("full_name").eq("id", collaboratorId).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchDesempenho(supabase, { from: start, to: end, unitId, collaboratorId }),
  ]);

  const pdf = await renderDesempenhoPdf(data, {
    periodLabel,
    unitLabel: unit?.name,
    collaboratorLabel: collaborator?.full_name,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="desempenho-${period}-${dateParam}.pdf"`,
    },
  });
}

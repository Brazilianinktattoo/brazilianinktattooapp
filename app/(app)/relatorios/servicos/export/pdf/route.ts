import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartParam, todayParam } from "@/lib/date";
import { fetchServiceReportLines } from "@/lib/reports/servicos";
import { renderServiceReportPdf } from "@/lib/reports/servicos-pdf";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const sp = request.nextUrl.searchParams;
  const filters = {
    from: sp.get("from") || monthStartParam(),
    to: sp.get("to") || todayParam(),
    collaboratorId: sp.get("collaborator_id") || undefined,
    unitId: sp.get("unit_id") || undefined,
    serviceQuery: sp.get("service") || undefined,
    clientQuery: sp.get("client") || undefined,
  };

  const supabase = await createClient();
  const lines = await fetchServiceReportLines(supabase, filters);
  const pdf = await renderServiceReportPdf(lines, filters);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-servicos-${filters.from}-a-${filters.to}.pdf"`,
    },
  });
}

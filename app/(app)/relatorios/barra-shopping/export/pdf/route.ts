import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartParam, todayParam } from "@/lib/date";
import { fetchBarraShoppingReport } from "@/lib/reports/barra-shopping";
import { renderBarraShoppingPdf } from "@/lib/reports/barra-shopping-pdf";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const sp = request.nextUrl.searchParams;
  const filters = {
    from: sp.get("from") || monthStartParam(),
    to: sp.get("to") || todayParam(),
  };

  const supabase = await createClient();
  const report = await fetchBarraShoppingReport(supabase, filters);
  const pdf = await renderBarraShoppingPdf(report, filters);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-barra-shopping-${filters.from}-a-${filters.to}.pdf"`,
    },
  });
}

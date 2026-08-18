import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartParam, todayParam } from "@/lib/date";
import { fetchBarraShoppingReport, barraShoppingToCsv } from "@/lib/reports/barra-shopping";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const sp = request.nextUrl.searchParams;
  const filters = {
    from: sp.get("from") || monthStartParam(),
    to: sp.get("to") || todayParam(),
  };

  const supabase = await createClient();
  const report = await fetchBarraShoppingReport(supabase, filters);
  const csv = "﻿" + barraShoppingToCsv(report);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-barra-shopping-${filters.from}-a-${filters.to}.csv"`,
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartParam, todayParam } from "@/lib/date";
import { fetchServiceReportLines, linesToCsv } from "@/lib/reports/servicos";

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
  const csv = "﻿" + linesToCsv(lines);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-servicos-${filters.from}-a-${filters.to}.csv"`,
    },
  });
}

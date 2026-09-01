import PDFDocument from "pdfkit";
import type { ServiceReportLine } from "@/lib/reports/servicos";
import { summarizeServiceReport } from "@/lib/reports/servicos";
import { formatStudioDate } from "@/lib/date";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COLS = [
  { key: "date", label: "Data", width: 50 },
  { key: "unitName", label: "Unidade", width: 60 },
  { key: "collaboratorName", label: "Colaborador", width: 80 },
  { key: "category", label: "Categoria", width: 50 },
  { key: "kind", label: "Tipo", width: 65 },
  { key: "clientName", label: "Cliente", width: 75 },
  { key: "description", label: "Serviço", width: 80 },
  { key: "price", label: "Valor", width: 50 },
  { key: "commission", label: "Comissão", width: 55 },
] as const;

export function renderServiceReportPdf(
  lines: ServiceReportLine[],
  params: { from: string; to: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const summary = summarizeServiceReport(lines);
    const fromLabel = new Date(`${params.from}T12:00:00Z`).toLocaleDateString("pt-BR");
    const toLabel = new Date(`${params.to}T12:00:00Z`).toLocaleDateString("pt-BR");

    doc.font("Helvetica-Bold").fontSize(16).text("Relatório de Serviços — Brazilian Ink Tattoo");
    doc.font("Helvetica").fontSize(10).text(`Período: ${fromLabel} a ${toLabel}`);
    doc.moveDown(0.5);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        `Total: ${summary.total.atendimentos} atendimento(s) · ${money(summary.total.faturado)} faturado · ${money(summary.total.comissao)} comissão`
      );
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Tatuagem: ${summary.tatuagem.atendimentos} atend. · ${money(summary.tatuagem.faturado)} · comissão ${money(summary.tatuagem.comissao)}`
      );
    doc.text(
      `Piercing: ${summary.piercing.atendimentos} atend. · ${money(summary.piercing.faturado)} · comissão ${money(summary.piercing.comissao)}`
    );
    doc.moveDown(1);

    const left = doc.page.margins.left;
    const rowHeight = 16;

    function drawHeader() {
      let x = left;
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8);
      for (const col of COLS) {
        doc.text(col.label, x, y, { width: col.width, continued: false });
        x += col.width;
      }
      doc.y = y;
      doc.moveDown(0.8);
      doc
        .moveTo(left, doc.y)
        .lineTo(left + COLS.reduce((s, c) => s + c.width, 0), doc.y)
        .strokeColor("#999999")
        .stroke();
      doc.moveDown(0.2);
    }

    drawHeader();

    doc.font("Helvetica").fontSize(8);
    for (const line of lines) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        drawHeader();
        doc.font("Helvetica").fontSize(8);
      }
      const y = doc.y;
      let x = left;
      const values: Record<string, string> = {
        date: line.date ? formatStudioDate(line.date) : "",
        unitName: line.unitName,
        collaboratorName: line.collaboratorName,
        category: line.category,
        kind: line.kind,
        clientName: line.clientName,
        description: line.description,
        price: money(line.price),
        commission: money(line.commission),
      };
      for (const col of COLS) {
        doc.text(values[col.key], x, y, { width: col.width - 4 });
        x += col.width;
      }
      doc.y = y;
      doc.moveDown(1.1);
    }

    if (lines.length === 0) {
      doc.font("Helvetica-Oblique").fontSize(9).text("Nenhum serviço encontrado com esses filtros.");
    }

    doc.end();
  });
}

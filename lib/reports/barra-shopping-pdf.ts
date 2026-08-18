import PDFDocument from "pdfkit";
import type { BarraShoppingReport, BarraShoppingLine } from "@/lib/reports/barra-shopping";
import { subtotal } from "@/lib/reports/barra-shopping";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COLS = [
  { key: "date", label: "Data", width: 70 },
  { key: "clientName", label: "Cliente", width: 150 },
  { key: "description", label: "Descrição", width: 200 },
  { key: "value", label: "Valor", width: 90 },
] as const;

export function renderBarraShoppingPdf(
  report: BarraShoppingReport,
  params: { from: string; to: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fromLabel = new Date(`${params.from}T12:00:00Z`).toLocaleDateString("pt-BR");
    const toLabel = new Date(`${params.to}T12:00:00Z`).toLocaleDateString("pt-BR");
    const left = doc.page.margins.left;
    const tableWidth = COLS.reduce((s, c) => s + c.width, 0);

    doc.font("Helvetica-Bold").fontSize(16).text("Relatório ao Financeiro — Barra Shopping");
    doc.font("Helvetica").fontSize(10).text(`Período: ${fromLabel} a ${toLabel}`);
    doc.moveDown(1);

    function drawTableHeader() {
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
        .lineTo(left + tableWidth, doc.y)
        .strokeColor("#999999")
        .stroke();
      doc.moveDown(0.2);
    }

    function ensureSpace(rowHeight: number) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
      }
    }

    function drawSection(title: string, lines: BarraShoppingLine[]) {
      ensureSpace(60);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text(title);
      doc.moveDown(0.3);

      if (lines.length === 0) {
        doc.font("Helvetica-Oblique").fontSize(9).text("Nenhum lançamento no período.");
        doc.moveDown(1);
        return;
      }

      drawTableHeader();
      doc.font("Helvetica").fontSize(8);
      for (const line of lines) {
        ensureSpace(16);
        if (doc.y === doc.page.margins.top) drawTableHeader();
        const y = doc.y;
        let x = left;
        const values: Record<string, string> = {
          date: line.date ? new Date(line.date).toLocaleDateString("pt-BR") : "",
          clientName: line.clientName,
          description: line.description,
          value: money(line.value),
        };
        for (const col of COLS) {
          doc.text(values[col.key], x, y, { width: col.width - 4 });
          x += col.width;
        }
        doc.y = y;
        doc.moveDown(1.1);
      }

      doc
        .moveTo(left, doc.y)
        .lineTo(left + tableWidth, doc.y)
        .strokeColor("#999999")
        .stroke();
      doc.moveDown(0.3);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`Subtotal: ${money(subtotal(lines))}`, left, doc.y, {
          width: tableWidth,
          align: "right",
        });
      doc.moveDown(1.2);
    }

    drawSection("Serviços de piercing", report.piercingServices);
    drawSection("Serviços de tatuagem", report.tattooServices);
    drawSection("Vendas de produtos/jóias", report.productSales);

    const grandTotal =
      subtotal(report.piercingServices) +
      subtotal(report.tattooServices) +
      subtotal(report.productSales);

    ensureSpace(40);
    doc.moveDown(0.5);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + tableWidth, doc.y)
      .strokeColor("#000000")
      .stroke();
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Total geral: ${money(grandTotal)}`, left, doc.y, {
        width: tableWidth,
        align: "right",
      });

    doc.end();
  });
}

import PDFDocument from "pdfkit";
import type { DesempenhoData } from "@/lib/reports/desempenho";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: { label: string; width: number }[],
  rows: string[][]
) {
  const left = doc.page.margins.left;
  const rowHeight = 16;

  function header() {
    let x = left;
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    for (const col of columns) {
      doc.text(col.label, x, y, { width: col.width });
      x += col.width;
    }
    doc.y = y;
    doc.moveDown(0.9);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + columns.reduce((s, c) => s + c.width, 0), doc.y)
      .strokeColor("#999999")
      .stroke();
    doc.moveDown(0.2);
  }

  header();
  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      header();
      doc.font("Helvetica").fontSize(9);
    }
    let x = left;
    const y = doc.y;
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], x, y, { width: columns[i].width });
      x += columns[i].width;
    }
    doc.y = y;
    doc.moveDown(0.9);
  }
  doc.moveDown(0.8);
}

export function renderDesempenhoPdf(
  data: DesempenhoData,
  params: { periodLabel: string; unitLabel?: string; collaboratorLabel?: string }
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

    doc.font("Helvetica-Bold").fontSize(18).text("Desempenho — Brazilian Ink Tattoo");
    doc.font("Helvetica").fontSize(10).fillColor("#333333").text(params.periodLabel);
    if (params.unitLabel || params.collaboratorLabel) {
      doc.text(
        [params.unitLabel, params.collaboratorLabel].filter(Boolean).join(" · ")
      );
    }
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text("Resumo do período");
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Faturamento total: ${money(data.totais.faturamento)}  ·  Comandas: ${data.totais.comandas} (${data.totais.comandasFechadas} fechadas)  ·  Serviços: ${data.totais.servicos}  ·  Jóias vendidas: ${data.totais.joias}  ·  Fichas preenchidas: ${data.fichasPreenchidas}`
      );
    doc.text(
      `Faturamento por tipo — Serviços: ${money(data.totais.faturamentoServicos)}  ·  Jóias: ${money(data.totais.faturamentoJoias)}  ·  Produtos: ${money(data.totais.faturamentoProdutos)}`
    );
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text("Faturamento por loja");
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { label: "Loja", width: 180 },
        { label: "Faturamento", width: 110 },
        { label: "Comandas", width: 90 },
        { label: "Fechadas", width: 90 },
      ],
      data.porLoja.map((l) => [
        l.unitName,
        money(l.faturamento),
        String(l.comandas),
        String(l.comandasFechadas),
      ])
    );

    doc.font("Helvetica-Bold").fontSize(12).text("Ranking de colaboradores");
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { label: "Colaborador", width: 150 },
        { label: "Acesso", width: 90 },
        { label: "Faturamento", width: 90 },
        { label: "Comandas", width: 70 },
        { label: "Serviços", width: 70 },
      ],
      data.porColaborador.map((c) => [
        c.collaboratorName,
        c.role,
        money(c.faturamento),
        String(c.comandas),
        String(c.servicos),
      ])
    );

    doc.font("Helvetica-Bold").fontSize(12).text("Serviços mais realizados");
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { label: "Serviço", width: 220 },
        { label: "Qtd.", width: 80 },
        { label: "Faturamento", width: 120 },
      ],
      data.porServico
        .slice(0, 15)
        .map((s) => [s.description, String(s.quantidade), money(s.faturamento)])
    );

    doc.font("Helvetica-Bold").fontSize(12).text("Jóias mais vendidas");
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { label: "Jóia", width: 220 },
        { label: "Qtd.", width: 80 },
        { label: "Faturamento", width: 120 },
      ],
      data.porJoia
        .slice(0, 15)
        .map((j) => [j.jewelryName, String(j.quantidade), money(j.faturamento)])
    );

    doc.font("Helvetica-Bold").fontSize(12).text("Movimento por dia da semana");
    doc.moveDown(0.4);
    const maxDia = Math.max(1, ...data.porDiaSemana.map((d) => d.comandas));
    const barMaxWidth = 300;
    for (const d of data.porDiaSemana) {
      const y = doc.y;
      doc.font("Helvetica").fontSize(9).fillColor("#000000").text(d.label, 40, y, { width: 70 });
      const barWidth = (d.comandas / maxDia) * barMaxWidth;
      doc.rect(115, y, Math.max(barWidth, 1), 10).fill("#c9a961");
      doc
        .fillColor("#000000")
        .text(String(d.comandas), 115 + barMaxWidth + 10, y, { width: 30 });
      doc.y = y + 16;
    }

    doc.end();
  });
}

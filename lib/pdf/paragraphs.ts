// Motor de parágrafos compartilhado entre os renderizadores de PDF
// (contrato de curso, ficha de anamnese, autorização de menores, ficha de
// coworking, recibo). Extraído do padrão já usado em
// lib/contracts/course-contract.ts pra não duplicar a lógica de fonte/layout.
import PDFDocument from "pdfkit";

export type Run = { text: string; b?: boolean; i?: boolean; u?: boolean };
export type Paragraph = {
  runs: Run[];
  align?: "left" | "center" | "right";
  size?: number;
  before?: number;
  after?: number;
};

export const BLANK = "_______________________________________________";

export function fontFor(run: Run) {
  if (run.b && run.i) return "Helvetica-BoldOblique";
  if (run.b) return "Helvetica-Bold";
  if (run.i) return "Helvetica-Oblique";
  return "Helvetica";
}

export function field(label: string, value: string, after = 200): Paragraph {
  return {
    runs: [
      { text: `${label} `, b: true },
      { text: value || BLANK },
    ],
    after,
  };
}

export function yesNoField(
  label: string,
  answer: { yes: boolean; detail: string } | undefined,
  after = 200
): Paragraph {
  const yes = answer?.yes ?? false;
  const detail = answer?.detail ?? "";
  return {
    runs: [
      { text: `${label} `, b: true },
      { text: yes ? "( X ) Sim   ( ) Não" : "( ) Sim   ( X ) Não" },
      ...(yes ? [{ text: `  — ${detail || BLANK}` }] : []),
    ],
    after,
  };
}

export function renderParagraphs(
  doc: PDFKit.PDFDocument,
  paragraphs: Paragraph[],
  pageWidth: number
) {
  for (const para of paragraphs) {
    if (para.before) doc.moveDown(para.before / 200);
    doc.fontSize(para.size ?? 10.5);
    const align = para.align ?? "left";
    para.runs.forEach((run, i) => {
      doc.font(fontFor(run)).text(run.text, {
        continued: i < para.runs.length - 1,
        align,
        underline: run.u ?? false,
        width: pageWidth,
      });
    });
    if (para.after) doc.moveDown(para.after / 200);
  }
}

export function renderLogoHeader(
  doc: PDFKit.PDFDocument,
  logoPath: string,
  logoWidth = 64,
  logoHeight = 64
) {
  doc.image(logoPath, doc.page.width / 2 - logoWidth / 2, doc.y, {
    width: logoWidth,
    height: logoHeight,
  });
  doc.y += logoHeight + 12;
}

export function renderPdfDocument(
  paragraphs: Paragraph[],
  opts: { logoPath?: string; logoWidth?: number; logoHeight?: number } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    if (opts.logoPath) {
      renderLogoHeader(doc, opts.logoPath, opts.logoWidth, opts.logoHeight);
    }

    renderParagraphs(doc, paragraphs, pageWidth);

    doc.end();
  });
}

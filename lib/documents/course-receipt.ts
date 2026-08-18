import { TATTOO_ESCOLA_LOGO } from "@/lib/documents/brand";
import { type Paragraph, BLANK, renderPdfDocument } from "@/lib/pdf/paragraphs";
import { amountToWordsPtBr } from "@/lib/documents/pt-number-to-words";

export type CourseReceiptPdfData = {
  studentName: string;
  cpf: string;
  address: string;
  cep: string;
  amount: number;
  courseName: string;
  dateExtenso: string;
};

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildParagraphs(data: CourseReceiptPdfData): Paragraph[] {
  const amountExtenso = amountToWordsPtBr(data.amount);
  return [
    { runs: [{ text: "TATTOO ESCOLA BIT", b: true }], align: "center", size: 12, after: 100 },
    { runs: [{ text: data.courseName.toUpperCase(), b: true }], align: "center", size: 11, after: 400 },
    { runs: [{ text: "RECIBO", b: true }], align: "center", size: 16, after: 400 },
    {
      runs: [
        { text: "Recebemos de " },
        { text: data.studentName || BLANK, b: true },
        { text: ", brasileiro(a), CPF " },
        { text: data.cpf || BLANK },
        { text: ", residente e domiciliado na " },
        { text: data.address || BLANK },
        { text: ", CEP " },
        { text: data.cep || BLANK },
        { text: ", a importância " },
        { text: money(data.amount), b: true },
        { text: ` (${amountExtenso}),` },
      ],
      after: 300,
    },
    {
      runs: [
        { text: "Referente ao " },
        { text: data.courseName, b: true },
        {
          text: " que será ministrado no ESTÚDIO BRAZILIAN INK TATTOO, estabelecido na Avenida das Américas, 500, Bloco 22, Loja 110 – Shopping Downtown – Barra da Tijuca/RJ.",
        },
      ],
      after: 500,
    },
    { runs: [{ text: `Rio de Janeiro, ${data.dateExtenso}.` }], align: "right", after: 500 },
    { runs: [{ text: BLANK }], align: "center", after: 100 },
    { runs: [{ text: "TATTOO ESCOLA BIT", b: true }], align: "center" },
  ];
}

export function renderCourseReceiptPdf(data: CourseReceiptPdfData): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: TATTOO_ESCOLA_LOGO.path,
    logoWidth: TATTOO_ESCOLA_LOGO.width,
    logoHeight: TATTOO_ESCOLA_LOGO.height,
  });
}

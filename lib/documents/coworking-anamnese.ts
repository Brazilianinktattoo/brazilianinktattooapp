import type { AnamneseLanguage, CoworkingProcedureType, HealthDeclaration } from "@/lib/types/database";
import { BRAZILIAN_INK_LOGO } from "@/lib/documents/brand";
import { type Paragraph, BLANK, field, yesNoField, renderPdfDocument } from "@/lib/pdf/paragraphs";
import { TEXT, healthQuestionsFor } from "@/lib/documents/coworking-anamnese-content";

export { TEXT, healthQuestionsFor };

export type CoworkingAnamnesePdfData = {
  language: AnamneseLanguage;
  fullName: string;
  cpf: string;
  address: string;
  cep: string;
  birthDateLabel: string;
  phone: string;
  procedureType: CoworkingProcedureType | null;
  professionalName: string;
  healthDeclaration: HealthDeclaration;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
};

function buildParagraphs(data: CoworkingAnamnesePdfData): Paragraph[] {
  const t = TEXT[data.language];
  const questions = healthQuestionsFor(data.language);
  const procedureText =
    data.procedureType === "tatuagem"
      ? `( X ) ${t.tattoo}   ( ) ${t.piercing}`
      : data.procedureType === "piercing"
        ? `( ) ${t.tattoo}   ( X ) ${t.piercing}`
        : `( ) ${t.tattoo}   ( ) ${t.piercing}`;

  return [
    { runs: [{ text: "BRAZILIAN INK TATTOO", b: true }], align: "center", size: 12, after: 100 },
    { runs: [{ text: t.title, b: true }], align: "center", size: 13, after: 100 },
    { runs: [{ text: t.subtitle, i: true }], align: "center", size: 9, after: 300 },
    field(t.name, data.fullName),
    field(t.cpf, data.cpf),
    field(t.address, data.address),
    field(t.cep, data.cep),
    field(t.birthDate, data.birthDateLabel),
    field(t.phone, data.phone),
    { runs: [{ text: `${t.procedure} `, b: true }, { text: procedureText }], after: 300 },
    { runs: [{ text: t.section2, b: true, u: true }], after: 100 },
    { runs: [{ text: t.healthIntro, i: true }], size: 9, after: 150 },
    ...questions.map((q) => yesNoField(q.label, data.healthDeclaration[q.key])),
    { runs: [{ text: t.section3, b: true, u: true }], before: 100, after: 150 },
    { runs: [{ text: t.consent }], after: 200 },
    { runs: [{ text: t.authorize(data.professionalName) }], after: 300 },
    { runs: [{ text: t.section4, b: true, u: true }], after: 150 },
    { runs: [{ text: t.liability }], size: 9, after: 300 },
    data.signed
      ? {
          runs: [
            { text: `Assinado eletronicamente por ${data.signerName} em ${data.signedAtLabel}.`, i: true },
          ],
          before: 200,
          after: 100,
        }
      : { runs: [{ text: BLANK }], before: 200, after: 100 },
    { runs: [{ text: t.signature, b: true }] },
  ];
}

export function renderCoworkingAnamnesePdf(
  data: CoworkingAnamnesePdfData
): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: BRAZILIAN_INK_LOGO.path,
    logoWidth: BRAZILIAN_INK_LOGO.width,
    logoHeight: BRAZILIAN_INK_LOGO.height,
  });
}

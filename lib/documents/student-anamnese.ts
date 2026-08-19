import type { HealthDeclaration } from "@/lib/types/database";
import { BRAZILIAN_INK_LOGO } from "@/lib/documents/brand";
import {
  type Paragraph,
  BLANK,
  field,
  yesNoField,
  renderPdfDocument,
} from "@/lib/pdf/paragraphs";
import { STUDENT_HEALTH_QUESTIONS } from "@/lib/documents/student-anamnese-questions";

export { STUDENT_HEALTH_QUESTIONS };

export type StudentAnamnesePdfData = {
  fullName: string;
  rg: string;
  cpf: string;
  birthDateLabel: string;
  address: string;
  cep: string;
  city: string;
  email: string;
  whatsapp: string;
  clientOrigin: string;
  bloodType: string;
  healthDeclaration: HealthDeclaration;
  photoAuthorization: boolean;
  consentText: string;
  photoAuthorizationText: string;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
  procedureLocation: string;
  procedureType: string;
  notes: string;
  studentName: string;
  value: string;
};

function buildParagraphs(data: StudentAnamnesePdfData): Paragraph[] {
  return [
    { runs: [{ text: "BRAZILIAN INK TATTOO", b: true }], align: "center", size: 12, after: 100 },
    {
      runs: [{ text: "FICHA DE ANAMNESE DE PIERCING", b: true }],
      align: "center",
      size: 14,
      after: 300,
    },
    { runs: [{ text: "1. IDENTIFICAÇÃO DO CLIENTE", b: true, u: true }], after: 150 },
    field("Nome completo:", data.fullName),
    field("RG:", data.rg),
    field("CPF:", data.cpf),
    field("Data de Nascimento:", data.birthDateLabel),
    field("Endereço:", data.address),
    field("CEP:", data.cep),
    field("Cidade:", data.city),
    field("E-mail:", data.email),
    field("WhatsApp:", data.whatsapp),
    field("Como nos conheceu:", data.clientOrigin, 300),

    { runs: [{ text: "2. HISTÓRICO DE SAÚDE", b: true, u: true }], after: 100 },
    {
      runs: [
        {
          text: "Para sua segurança, é obrigatório declarar informações verdadeiras sobre sua saúde.",
          i: true,
        },
      ],
      size: 9,
      after: 150,
    },
    ...STUDENT_HEALTH_QUESTIONS.map((q) =>
      yesNoField(q.label, data.healthDeclaration[q.key])
    ),
    field("Tipo sanguíneo e fator RH:", data.bloodType, 300),

    { runs: [{ text: "3. TERMO DE RESPONSABILIDADE", b: true, u: true }], after: 150 },
    { runs: [{ text: data.consentText || BLANK }], after: 150 },
    {
      runs: [
        {
          text: data.photoAuthorization
            ? `( X ) ${data.photoAuthorizationText}`
            : `( ) ${data.photoAuthorizationText}`,
        },
      ],
      size: 9,
      after: 200,
    },
    data.signed
      ? {
          runs: [
            {
              text: `Assinado eletronicamente por ${data.signerName} em ${data.signedAtLabel}.`,
              i: true,
            },
          ],
          before: 100,
          after: 100,
        }
      : { runs: [{ text: BLANK }], before: 100, after: 100 },
    { runs: [{ text: "Assinatura do Cliente", b: true }], after: 300 },

    { runs: [{ text: "4. ESPAÇO EXCLUSIVO DO ESTÚDIO — PROFISSIONAL", b: true, u: true }], after: 150 },
    field("Local da tattoo/piercing:", data.procedureLocation),
    field("Tipo:", data.procedureType),
    field("Observações:", data.notes),
    field("Profissional (aluno responsável):", data.studentName),
    field("Valor:", data.value, 100),
  ];
}

export function renderStudentAnamnesePdf(data: StudentAnamnesePdfData): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: BRAZILIAN_INK_LOGO.path,
    logoWidth: BRAZILIAN_INK_LOGO.width,
    logoHeight: BRAZILIAN_INK_LOGO.height,
  });
}

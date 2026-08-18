import type { HealthDeclaration, ProcedureType } from "@/lib/types/database";
import { BRAZILIAN_INK_LOGO } from "@/lib/documents/brand";
import {
  type Paragraph,
  BLANK,
  field,
  yesNoField,
  renderPdfDocument,
} from "@/lib/pdf/paragraphs";
import { ANAMNESE_HEALTH_QUESTIONS } from "@/lib/documents/anamnese-questions";

export { ANAMNESE_HEALTH_QUESTIONS };

export type AnamnesePdfData = {
  fullName: string;
  birthDateLabel: string;
  cpf: string;
  rg: string;
  address: string;
  cep: string;
  phone: string;
  email: string;
  isMinor: boolean | null;
  procedureType: ProcedureType | null;
  procedureDescription: string;
  bodyLocation: string;
  professionalName: string;
  unitName: string;
  appointmentDateLabel: string;
  healthDeclaration: HealthDeclaration;
  pregnantAnswer: string;
  alcohol24h: boolean;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
};

function procedureLabel(t: ProcedureType | null) {
  if (t === "tatuagem") return "( X ) Tatuagem   ( ) Piercing   ( ) Ambos";
  if (t === "piercing") return "( ) Tatuagem   ( X ) Piercing   ( ) Ambos";
  if (t === "ambos") return "( ) Tatuagem   ( ) Piercing   ( X ) Ambos";
  return "( ) Tatuagem   ( ) Piercing   ( ) Ambos";
}

function buildParagraphs(data: AnamnesePdfData): Paragraph[] {
  return [
    { runs: [{ text: "BRAZILIAN INK TATTOO", b: true }], align: "center", size: 12, after: 100 },
    {
      runs: [{ text: "FICHA DE ANAMNESE — TATUAGEM E BODY PIERCING", b: true }],
      align: "center",
      size: 14,
      after: 100,
    },
    {
      runs: [
        {
          text: "Documento elaborado em conformidade com a Resolução SMG nº 690/2004, Lei Municipal nº 4.388/2006, RDC Anvisa nº 55/2008 e Lei Estadual nº 7.970/2018",
          i: true,
        },
      ],
      align: "center",
      size: 8,
      after: 300,
    },
    { runs: [{ text: "1. IDENTIFICAÇÃO DO CLIENTE", b: true, u: true }], after: 150 },
    field("Nome completo:", data.fullName),
    field("Data de Nascimento:", data.birthDateLabel),
    field("CPF:", data.cpf),
    field("RG:", data.rg),
    field("Endereço completo:", data.address),
    field("CEP:", data.cep),
    field("Telefone:", data.phone),
    field("E-mail:", data.email),
    {
      runs: [
        { text: "Cliente é menor de idade? ", b: true },
        {
          text:
            data.isMinor === true
              ? "( X ) Sim — Autorização do Responsável Legal anexa"
              : data.isMinor === false
                ? "( ) Sim   ( X ) Não"
                : "( ) Sim   ( ) Não",
        },
      ],
      after: 300,
    },
    { runs: [{ text: "2. IDENTIFICAÇÃO DO PROCEDIMENTO", b: true, u: true }], after: 150 },
    {
      runs: [
        { text: "Tipo de procedimento: ", b: true },
        { text: procedureLabel(data.procedureType) },
      ],
      after: 200,
    },
    field("Descrição do procedimento:", data.procedureDescription),
    field("Localização no corpo:", data.bodyLocation),
    field("Profissional responsável:", data.professionalName),
    field("Unidade:", data.unitName),
    field("Data do atendimento:", data.appointmentDateLabel, 300),
    { runs: [{ text: "3. DECLARAÇÃO DE SAÚDE", b: true, u: true }], after: 100 },
    {
      runs: [
        {
          text: "Para sua segurança, é obrigatório declarar informações verdadeiras sobre sua saúde. Omissões podem colocar em risco o resultado do procedimento e sua própria saúde.",
          i: true,
        },
      ],
      size: 9,
      after: 150,
    },
    ...ANAMNESE_HEALTH_QUESTIONS.map((q) =>
      yesNoField(q.label, data.healthDeclaration[q.key])
    ),
    {
      runs: [
        { text: "Está grávida ou amamentando? ", b: true },
        { text: data.pregnantAnswer || "( ) Não   ( ) Sim   ( ) Não se aplica" },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Ingeriu álcool ou substâncias que afinam o sangue nas últimas 24 horas? ", b: true },
        { text: data.alcohol24h ? "( X ) Sim" : "( ) Sim   ( X ) Não" },
      ],
      after: 300,
    },
    {
      runs: [{ text: "4. TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", b: true, u: true }],
      after: 150,
    },
    {
      runs: [
        {
          text: "Declaro estar ciente de que o procedimento envolve o rompimento da barreira natural da pele, com riscos inerentes de dor, edema, hematoma, sangramento, reação alérgica e infecção. Fui informado(a) sobre os cuidados pós-procedimento necessários para uma cicatrização adequada, bem como sobre a dificuldade do processo de remoção, quando aplicável.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "Declaro que todas as informações de saúde prestadas acima são verdadeiras e completas, estando ciente de que a omissão de qualquer informação é de minha inteira responsabilidade.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "Declaro ainda estar ciente de que o estúdio e seus profissionais não se responsabilizam pelos resultados do procedimento, tampouco por complicações, infecções ou intercorrências, caso eu não siga rigorosamente os cuidados pós-procedimento indicados pelo(a) profissional responsável.",
        },
      ],
      after: 200,
    },
    field("Autorizo a execução do procedimento pelo(a) profissional:", data.professionalName, 300),
    data.signed
      ? {
          runs: [
            {
              text: `Assinado eletronicamente por ${data.signerName} em ${data.signedAtLabel}.`,
              i: true,
            },
          ],
          before: 200,
          after: 100,
        }
      : { runs: [{ text: BLANK }], before: 200, after: 100 },
    {
      runs: [{ text: "Assinatura do Cliente (ou Responsável Legal, se menor)", b: true }],
      after: 100,
    },
  ];
}

export function renderAnamnesePdf(data: AnamnesePdfData): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: BRAZILIAN_INK_LOGO.path,
    logoWidth: BRAZILIAN_INK_LOGO.width,
    logoHeight: BRAZILIAN_INK_LOGO.height,
  });
}

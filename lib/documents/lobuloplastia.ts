import type { HealthDeclaration } from "@/lib/types/database";
import { BRAZILIAN_INK_LOGO } from "@/lib/documents/brand";
import {
  type Paragraph,
  BLANK,
  field,
  yesNoField,
  renderPdfDocument,
} from "@/lib/pdf/paragraphs";
import { LOBULOPLASTIA_HEALTH_QUESTIONS } from "@/lib/documents/lobuloplastia-questions";

export { LOBULOPLASTIA_HEALTH_QUESTIONS };

export type LobuloplastiaPdfData = {
  fullName: string;
  birthDateLabel: string;
  cpf: string;
  rg: string;
  phone: string;
  socialMedia: string;
  address: string;
  city: string;
  cep: string;
  healthDeclaration: HealthDeclaration;
  fendaDescription: string;
  professionalName: string;
  consentText: string;
  imageAuthorization: boolean;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
};

function buildParagraphs(data: LobuloplastiaPdfData): Paragraph[] {
  return [
    { runs: [{ text: "BRAZILIAN INK TATTOO", b: true }], align: "center", size: 12, after: 100 },
    {
      runs: [{ text: "FICHA DE ANAMNESE — LOBULOPLASTIA", b: true }],
      align: "center",
      size: 14,
      after: 300,
    },
    { runs: [{ text: "1. DADOS PESSOAIS", b: true, u: true }], after: 150 },
    field("Nome completo:", data.fullName),
    field("Data de nascimento:", data.birthDateLabel),
    field("RG/CPF:", [data.rg, data.cpf].filter(Boolean).join(" / ")),
    field("Telefone:", data.phone),
    field("Rede social:", data.socialMedia),
    field("Endereço:", data.address),
    field("Cidade/CEP:", [data.city, data.cep].filter(Boolean).join(" / "), 300),
    { runs: [{ text: "2. ANAMNESE", b: true, u: true }], after: 100 },
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
    ...LOBULOPLASTIA_HEALTH_QUESTIONS.map((q) =>
      yesNoField(q.label, data.healthDeclaration[q.key])
    ),
    { runs: [{ text: "" }], after: 100 },
    { runs: [{ text: "3. DADOS DO PROCEDIMENTO", b: true, u: true }], after: 150 },
    field("Descrição e localização da fenda:", data.fendaDescription),
    field("Profissional responsável:", data.professionalName, 300),
    {
      runs: [{ text: "4. TERMO DE CONSENTIMENTO", b: true, u: true }],
      after: 150,
    },
    { runs: [{ text: data.consentText }], after: 300 },
    { runs: [{ text: "5. USO DE IMAGEM", b: true, u: true }], after: 100 },
    {
      runs: [
        {
          text: data.imageAuthorization
            ? "( X ) AUTORIZO o uso da minha imagem pessoal para fins de divulgação."
            : "( ) NÃO autorizo o uso da minha imagem pessoal para fins de divulgação.",
        },
      ],
      after: 300,
    },
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

export function renderLobuloplastiaPdf(data: LobuloplastiaPdfData): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: BRAZILIAN_INK_LOGO.path,
    logoWidth: BRAZILIAN_INK_LOGO.width,
    logoHeight: BRAZILIAN_INK_LOGO.height,
  });
}

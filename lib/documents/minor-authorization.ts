import type { HealthDeclaration } from "@/lib/types/database";
import { BRAZILIAN_INK_LOGO } from "@/lib/documents/brand";
import { type Paragraph, BLANK, field, yesNoField, renderPdfDocument } from "@/lib/pdf/paragraphs";
import { MINOR_HEALTH_QUESTIONS } from "@/lib/documents/minor-authorization-questions";

export { MINOR_HEALTH_QUESTIONS };

export type MinorAuthorizationPdfData = {
  piercerName: string;
  bodyLocation: string;
  guardianName: string;
  guardianRg: string;
  guardianCpf: string;
  guardianBirthDateLabel: string;
  guardianMaritalStatus: string;
  guardianAddress: string;
  guardianNeighborhood: string;
  guardianCity: string;
  guardianState: string;
  guardianCep: string;
  guardianPhone: string;
  guardianEmail: string;
  minorName: string;
  minorRg: string;
  minorCpf: string;
  minorBirthDateLabel: string;
  minorPhone: string;
  minorEmail: string;
  minorHealthDeclaration: HealthDeclaration;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
};

function buildParagraphs(data: MinorAuthorizationPdfData): Paragraph[] {
  return [
    { runs: [{ text: "BRAZILIAN INK TATTOO", b: true }], align: "center", size: 12, after: 100 },
    {
      runs: [{ text: "AUTORIZAÇÃO DE PIERCING PARA MENORES", b: true }],
      align: "center",
      size: 14,
      after: 300,
    },
    {
      runs: [
        {
          text: `Eu, abaixo assinado, declaro que no gozo pleno das minhas faculdades mentais e psíquicas, pelo presente e na melhor forma do direito, AUTORIZO O BODY PIERCER, ${data.piercerName || BLANK}, a perfurar o ${data.bodyLocation || BLANK} do (da) meu (minha) filho(a) menor abaixo identificado(a).`,
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "Assumo na qualidade de Genitor(a) do(a) menor, plena responsabilidade pelo trabalho autorizado e de minha livre vontade declaro que isento de responsabilidade civil ou criminal o Body Piercer pela execução do trabalho.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "Declaro ainda, ser do meu conhecimento as técnicas a serem executadas, os materiais utilizados, bem como fui informado e tenho total ciência dos procedimentos e cuidados que deverão ser aplicados durante o período de pós perfuração até a total cicatrização.",
        },
      ],
      after: 300,
    },
    { runs: [{ text: "É o que tinha a declarar.", i: true }], after: 300 },
    { runs: [{ text: "DADOS DO RESPONSÁVEL", b: true, u: true }], after: 150 },
    field("Responsável:", data.guardianName),
    field("RG:", data.guardianRg),
    field("CPF:", data.guardianCpf),
    field("Data de Nascimento:", data.guardianBirthDateLabel),
    field("Estado Civil:", data.guardianMaritalStatus),
    field("Endereço:", data.guardianAddress),
    field("Bairro:", data.guardianNeighborhood),
    field("Cidade:", data.guardianCity),
    field("Estado:", data.guardianState),
    field("CEP:", data.guardianCep),
    field("Telefone:", data.guardianPhone),
    field("E-mail:", data.guardianEmail, 300),
    { runs: [{ text: "DADOS DA(O) MENOR", b: true, u: true }], after: 150 },
    field("Nome:", data.minorName),
    field("RG:", data.minorRg),
    field("CPF:", data.minorCpf),
    field("Data de Nascimento:", data.minorBirthDateLabel),
    field("Telefone:", data.minorPhone),
    field("E-mail:", data.minorEmail, 300),
    ...MINOR_HEALTH_QUESTIONS.map((q) =>
      yesNoField(q.label, data.minorHealthDeclaration[q.key])
    ),
    {
      runs: [
        {
          text: "DECLARO SEREM VERDADEIRAS AS AFIRMAÇÕES ACIMA DECLARADAS E ASSUMO TOTAL RESPONSABILIDADE POR QUALQUER OMISSÃO OU ERRO NAS MESMAS.",
          b: true,
        },
      ],
      before: 200,
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
          before: 200,
          after: 100,
        }
      : { runs: [{ text: BLANK }], before: 200, after: 100 },
    { runs: [{ text: "Assinatura do Responsável", b: true }] },
  ];
}

export function renderMinorAuthorizationPdf(
  data: MinorAuthorizationPdfData
): Promise<Buffer> {
  return renderPdfDocument(buildParagraphs(data), {
    logoPath: BRAZILIAN_INK_LOGO.path,
    logoWidth: BRAZILIAN_INK_LOGO.width,
    logoHeight: BRAZILIAN_INK_LOGO.height,
  });
}

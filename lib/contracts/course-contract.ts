import PDFDocument from "pdfkit";
import path from "node:path";
import type { CourseType } from "@/lib/types/database";

// Engine compartilhado dos contratos de curso. O texto (idêntico entre os
// modelos, exceto pelo título/nome do curso e pelo parágrafo de reposição
// de aula) fica em CONTRACT_VARIANTS — cada curso novo vira só uma entrada
// nova ali, a partir do modelo real enviado pelo estúdio.

const LOGO_PATH = path.join(process.cwd(), "lib/contracts/assets/tattoo-escola-bit-logo.png");

type Run = { text: string; b?: boolean; i?: boolean; u?: boolean };
type Paragraph = {
  runs: Run[];
  align?: "left" | "center";
  size?: number;
  before?: number;
  after?: number;
};

export type ContractFieldsData = {
  studentName: string;
  rg: string;
  cpf: string;
  address: string;
  state: string;
  dateExtenso: string;
  signed: boolean;
  signerName?: string;
  signedAtLabel?: string;
};

export type ContractVariant = {
  // Ex: "Curso Presencial de Tatuagem para Iniciantes"
  courseTitle: string;
  // Ex: "CURSO PRESENCIAL DE TATUAGEM PARA INICIANTES" (usado na frase
  // "...o presente Contrato de Prestação de Serviços Educacionais - X.")
  courseNameCaps: string;
  // Parágrafo Único sobre reposição de aula, logo após a Cláusula Nona —
  // é o único trecho de cláusula que varia de curso pra curso nos modelos
  // recebidos até agora.
  makeupClassParagraph: string;
};

const BLANK = "_______________________________________________";

function buildParagraphs(data: ContractFieldsData, variant: ContractVariant): Paragraph[] {
  const field = (label: string, value: string): Paragraph => ({
    runs: [
      { text: `${label} `, b: true },
      { text: value || BLANK },
    ],
    after: 200,
  });

  return [
    { runs: [{ text: "TATTOO ESCOLA BIT", b: true }], align: "center", size: 12, after: 100 },
    {
      runs: [{ text: "em parceria com BRAZILIAN INK TATTOO", i: true }],
      align: "center",
      size: 10,
      after: 300,
    },
    {
      runs: [{ text: "Contrato de Prestação de Serviços Educacionais", b: true }],
      align: "center",
      size: 15,
      after: 100,
    },
    {
      runs: [{ text: variant.courseTitle, b: true, u: true }],
      align: "center",
      size: 12,
      after: 400,
    },
    {
      runs: [
        {
          text: "Pelo presente instrumento particular, de um lado, a TATTOO ESCOLA BIT em parceria com BRAZILIAN INK TATTOO, estabelecida na Av. das Américas, 500, Bloco 22, Loja 110 - Shopping Downtown, Barra da Tijuca/RJ - CEP 22640-904, inscrita no CNPJ 28.764.720/0001-42, doravante denominada CONTRATADA e do outro lado denominado como CONTRATANTE:",
        },
      ],
      after: 300,
    },
    field("Nome completo do(a) aluno(a):", data.studentName),
    field("RG:", data.rg),
    field("CPF:", data.cpf),
    field("Endereço completo:", data.address),
    field("Estado:", data.state),
    {
      runs: [
        {
          text: `têm entre si, justo e acordado, o presente Contrato de Prestação de Serviços Educacionais - ${variant.courseNameCaps}.`,
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "As partes obrigam-se mutuamente, por si e seus sucessores, a respeitar e cumprir o que se segue:",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Primeira:", b: true, u: true },
        {
          text: " O presente contrato é celebrado com base nas disposições legais vigentes que regulam os cursos livres de qualificação profissional presencial.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Segunda:", b: true, u: true },
        {
          text: " A Contratada obriga-se a ministrar aulas teóricas e práticas, em conformidade com o conteúdo programático necessário para a formação profissional do tatuador iniciante, obedecendo os critérios estabelecidos pela Contratada.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Terceira:", b: true, u: true },
        {
          text: " A Contratada fica obrigada a fornecer, para uso em sala de aula, todo material necessário ao aprendizado, bem como local adequado e toda assepsia exigida pelas normas sanitárias locais.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Quarta:", b: true, u: true },
        {
          text: " É de inteira responsabilidade da Contratada o planejamento e a prestação dos serviços de ensino, no que se refere à avaliação, fixação da carga horária, designação de professores, orientação educacional, além de outras providências que as atividades exigirem, obedecendo ao seu exclusivo critério, sem ingerência do Contratante.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Parágrafo Primeiro: ", b: true },
        {
          text: "O Contratante, após cumprir todos os requisitos fixados pela Contratada, receberá o CERTIFICADO DE CONCLUSÃO, confeccionado pela Contratada.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Quinta:", b: true, u: true },
        {
          text: " O Contratante não fica obrigado a contrair o material fornecido pela Contratada para o estudo e prática, ficando a seu critério a aquisição dos mesmos.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Sexta:", b: true, u: true },
        {
          text: " O Contratante estará sujeito às normas da Contratada, no que diz respeito a frequência, pagamentos, horários de reposição de aulas e critérios de avaliação.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Sétima:", b: true, u: true },
        {
          text: " O Contratante autoriza a Contratada a divulgar por veículos de comunicação em massa, mídias sociais digitais ou de publicidade em geral (imprensa, rádio, internet, televisão, livros, apostilas, revistas, prospectos, outdoor, etc.), imagens, fotos, filmagens, entrevistas, individuais ou em grupos, bem como resultados em concursos ou eventos de tatuagem, desde que tais meios valorizem e dignifiquem o(a) aluno(a) e o Estúdio Brazilian Ink Tattoo, sem que tal divulgação compreenda qualquer direito de pagamento, indenização, participação ou compensação, a qualquer título.",
        },
      ],
      after: 200,
    },
    {
      runs: [{ text: "Cláusula Oitava: DA DESISTÊNCIA, CANCELAMENTO E REEMBOLSO", b: true, u: true }],
      after: 100,
    },
    {
      runs: [
        {
          text: "O(A) Contratante terá o prazo de 7 (sete) dias corridos, contados da data de assinatura deste contrato, para desistir da contratação com devolução integral dos valores pagos, nos termos do Código de Defesa do Consumidor (Lei nº 8.078/1990), desde que a desistência ocorra antes do início das aulas.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "Após o prazo acima, em caso de desistência do(a) Contratante já efetivada a matrícula, fica o mesmo ciente que:",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "a) Será descontado do valor total pago, o correspondente às aulas já assistidas (presenciais e/ou online), calculadas de forma proporcional ao valor total do curso;",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "b) Caso o pagamento tenha sido realizado por meio de cartão de crédito ou outra forma que gere taxas administrativas, tais encargos serão integralmente descontados do valor a ser eventualmente reembolsado;",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "c) Também serão descontadas as despesas com materiais, apostilas, kits, insumos, certificados, taxas de matrícula e quaisquer outros itens que tenham sido disponibilizados ao(à) contratante;",
        },
      ],
      after: 200,
    },
    {
      runs: [
        {
          text: "d) O valor remanescente, se houver, será apurado em até 15 dias úteis após a formalização por escrito do pedido de cancelamento.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Parágrafo Único: ", b: true },
        {
          text: "Decorrido o prazo de arrependimento de 7 (sete) dias previsto acima, o(a) Contratante declara estar ciente de que o comparecimento às aulas implica concordância com o presente termo, não sendo cabível reembolso integral em caso de desistência voluntária.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Nona:", b: true, u: true },
        {
          text: " Ao firmar o presente contrato, fica esclarecido que o Contratante deverá cumprir os compromissos de avaliação e frequência devidamente adotados pela Contratada. Dessa forma, para ter concluído o curso, o Contratante deve obter avaliação positiva nas aplicações práticas, de acordo com o critério de avaliação da Contratada e completar, integralmente, as horas de aula previstas no curso. Caso o Contratante não cumpra as exigências estabelecidas pela Contratada, não concluirá o curso e, portanto, não receberá o Certificado de Conclusão.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Parágrafo Único: ", b: true },
        { text: variant.makeupClassParagraph },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Décima:", b: true, u: true },
        {
          text: " As informações, logotipos, e demais identificadores da Contratada são protegidos por direitos autorais e pelas demais normas de proteção às propriedades imateriais, sendo de titularidade exclusiva da Contratada.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Décima Primeira:", b: true, u: true },
        {
          text: " As partes elegem o Foro da Comarca do Rio de Janeiro/RJ como competente para dirimir quaisquer controvérsias oriundas do presente contrato, com a exclusão de qualquer outro, por mais privilegiado que seja ou venha ser.",
        },
      ],
      after: 200,
    },
    {
      runs: [
        { text: "Cláusula Décima Segunda:", b: true, u: true },
        {
          text: " Ao assinar o presente contrato o Contratante declara ter cuidadosamente examinado e incondicionalmente concordado com os termos e condições constantes no presente contrato.",
        },
      ],
      after: 300,
    },
    {
      runs: [{ text: `Rio de Janeiro, ${data.dateExtenso}.` }],
      before: 300,
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
          before: 300,
          after: 100,
        }
      : { runs: [{ text: BLANK }], before: 300, after: 100 },
    { runs: [{ text: "CONTRATANTE (assinatura do aluno)", b: true }], after: 400 },
    { runs: [{ text: BLANK }], after: 100 },
    { runs: [{ text: "TATTOO ESCOLA BIT — Contratado", b: true }] },
  ];
}

function fontFor(run: Run) {
  if (run.b && run.i) return "Helvetica-BoldOblique";
  if (run.b) return "Helvetica-Bold";
  if (run.i) return "Helvetica-Oblique";
  return "Helvetica";
}

// Textos extraídos fielmente dos modelos reais enviados pelo estúdio
// (Contrato_Curso_Tatuagem_Iniciantes_BIT.docx e
// Contrato_Curso_Especialização em Tatuagem_BIT_1.pdf — comparados palavra
// por palavra, só diferem no título/nome do curso e neste parágrafo).
// Piercing Iniciante e Especialização em Piercing entram aqui assim que o
// estúdio enviar os respectivos modelos.
export const CONTRACT_VARIANTS: Partial<Record<CourseType, ContractVariant>> = {
  tatuagem_iniciante: {
    courseTitle: "Curso Presencial de Tatuagem para Iniciantes",
    courseNameCaps: "CURSO PRESENCIAL DE TATUAGEM PARA INICIANTES",
    makeupClassParagraph:
      "A reposição das aulas, eventualmente perdidas, será realizada mediante o pagamento do valor de R$ 200,00 (duzentos reais) por aula, para as aulas ministradas ao longo da semana e o valor de R$ 350,00 (trezentos e cinquenta reais) para as ministradas aos sábados, e ocorrerão nos dias e horários que forem mais adequados à Contratada.",
  },
  tatuagem_especializacao: {
    courseTitle: "Curso Presencial de Especialização em Tatuagem",
    courseNameCaps: "CURSO PRESENCIAL DE ESPECIALIZAÇÃO EM TATUAGEM",
    makeupClassParagraph: "Considerando se tratar de curso de três dias não haverá reposição de aulas perdidas.",
  },
};

export function hasContractTemplate(courseType: CourseType) {
  return courseType in CONTRACT_VARIANTS;
}

export function renderCourseContractPdf(
  courseType: CourseType,
  data: ContractFieldsData
): Promise<Buffer> {
  const variant = CONTRACT_VARIANTS[courseType];
  if (!variant) {
    return Promise.reject(new Error(`Sem modelo de contrato configurado para ${courseType}.`));
  }

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
    const logoSize = 64;
    doc.image(LOGO_PATH, doc.page.width / 2 - logoSize / 2, doc.y, {
      width: logoSize,
      height: logoSize,
    });
    doc.y += logoSize + 12;

    for (const para of buildParagraphs(data, variant)) {
      if (para.before) doc.moveDown(para.before / 200);
      doc.fontSize(para.size ?? 10.5);
      const align = para.align ?? "left";
      para.runs.forEach((run, i) => {
        doc
          .font(fontFor(run))
          .text(run.text, {
            continued: i < para.runs.length - 1,
            align,
            underline: run.u ?? false,
            width: pageWidth,
          });
      });
      if (para.after) doc.moveDown(para.after / 200);
    }

    doc.end();
  });
}

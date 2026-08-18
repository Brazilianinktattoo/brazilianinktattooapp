import type { AnamneseLanguage } from "@/lib/types/database";

// Textos extraídos fielmente dos modelos reais
// Ficha_Anamnese_BIT_Portugues/Ingles/Espanhol.docx — termo de consentimento
// e registro pra tatuadores e body piercers visitantes do coworking.
// Separado do renderizador de PDF (coworking-anamnese.ts, que importa
// pdfkit) pra poder ser importado por componente "use client".
const BLANK = "_______________________________________________";

const HEALTH_QUESTIONS: Record<AnamneseLanguage, { key: string; label: string }[]> = {
  portugues: [
    { key: "medications", label: "Faz uso de medicamentos contínuos? Quais?" },
    {
      key: "chronic_disease",
      label: "Possui alguma Doença Crônica (Hepatite C, HIV, Diabetes, Epilepsia)? Qual(is)?",
    },
    { key: "anticoagulants", label: "Faz uso de anticoagulantes, Aspirina, AAS etc.? Qual(is)?" },
    { key: "allergy", label: "Tem alergia a látex, tintas, metais, iodo ou outros? Qual(is)?" },
    {
      key: "transmissible_autoimmune_cardiac",
      label: "Possui alguma doença transmissível, autoimune ou condição cardíaca? Qual(is)?",
    },
    {
      key: "coagulation_disorder",
      label: "Possui algum distúrbio de coagulação, hemofilia ou tendência a sangramentos? Qual(is)?",
    },
  ],
  ingles: [
    { key: "medications", label: "Are you currently taking any medications? Which ones?" },
    {
      key: "chronic_disease",
      label: "Do you have any chronic disease (Hepatitis C, HIV, Diabetes, Epilepsy)? Which?",
    },
    { key: "anticoagulants", label: "Do you use anticoagulants, Aspirin, ASA, etc.? Which?" },
    { key: "allergy", label: "Do you have allergies to latex, ink, metals, iodine or others? Which?" },
    {
      key: "transmissible_autoimmune_cardiac",
      label: "Do you have any communicable disease, autoimmune condition or heart condition? Which?",
    },
    {
      key: "coagulation_disorder",
      label: "Do you have any coagulation disorder, hemophilia or bleeding tendency? Which?",
    },
  ],
  espanhol: [
    { key: "medications", label: "¿Toma medicamentos de forma continua? ¿Cuáles?" },
    {
      key: "chronic_disease",
      label: "¿Tiene alguna enfermedad crónica (Hepatitis C, VIH, Diabetes, Epilepsia)? ¿Cuál(es)?",
    },
    { key: "anticoagulants", label: "¿Usa anticoagulantes, Aspirina, AAS, etc.? ¿Cuál(es)?" },
    { key: "allergy", label: "¿Tiene alergia al látex, tintas, metales, yodo u otros? ¿Cuál(es)?" },
    {
      key: "transmissible_autoimmune_cardiac",
      label: "¿Tiene alguna enfermedad transmisible, autoinmune o condición cardíaca? ¿Cuál(es)?",
    },
    {
      key: "coagulation_disorder",
      label: "¿Tiene algún trastorno de coagulación, hemofilia o tendencia a sangrado? ¿Cuál(es)?",
    },
  ],
};

export function healthQuestionsFor(language: AnamneseLanguage) {
  return HEALTH_QUESTIONS[language];
}

export const TEXT: Record<
  AnamneseLanguage,
  {
    title: string;
    subtitle: string;
    section1: string;
    name: string;
    cpf: string;
    address: string;
    cep: string;
    birthDate: string;
    phone: string;
    procedure: string;
    tattoo: string;
    piercing: string;
    section2: string;
    healthIntro: string;
    section3: string;
    consent: string;
    authorize: (professional: string) => string;
    section4: string;
    liability: string;
    signature: string;
  }
> = {
  portugues: {
    title: "FICHA DE ANAMNESE",
    subtitle: "1. TERMO DE CONSENTIMENTO E REGISTRO — PARA TATUADORES E BODY PIERCERS VISITANTES E ALUNOS",
    section1: "IDENTIFICAÇÃO DO CLIENTE",
    name: "Nome:",
    cpf: "CPF:",
    address: "Endereço:",
    cep: "CEP:",
    birthDate: "Data de Nascimento:",
    phone: "Telefone:",
    procedure: "Procedimento:",
    tattoo: "Tatuagem",
    piercing: "Piercing",
    section2: "2. DECLARAÇÃO DE SAÚDE",
    healthIntro: "Declaro não omitir ou mentir as informações acerca da minha saúde, incluindo:",
    section3: "3. TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO",
    consent:
      "Declaro estar ciente dos riscos inerentes ao procedimento permanente (dor, edema, hematoma), das dificuldades que envolvem o processo de remoção e dos cuidados pós-procedimento.",
    authorize: (p) => `Autorizo a execução do trabalho pelo profissional: ${p || BLANK}`,
    section4: "4. TERMO DE RESPONSABILIDADE",
    liability:
      "A BRAZILIAN INK TATTOO não se responsabiliza pelos atendimentos e procedimentos realizados pelos TATUADORES e BODY PIERCERS VISITANTES, uma vez que não temos como controlar a forma como os mesmos realizam seus trabalhos em seus locais de origem. Fica claro que a responsabilidade do estúdio se restringe tão e somente à locação do espaço destinado ao atendimento.",
    signature: "Assinatura do Cliente",
  },
  ingles: {
    title: "CONSENT AND REGISTRY FORM (FICHA DE ANAMNESE)",
    subtitle: "1. CLIENT IDENTIFICATION",
    section1: "CLIENT IDENTIFICATION",
    name: "Name:",
    cpf: "ID/Tax ID:",
    address: "Address:",
    cep: "ZIP Code:",
    birthDate: "Date of Birth:",
    phone: "Phone:",
    procedure: "Procedure:",
    tattoo: "Tattoo",
    piercing: "Piercing",
    section2: "2. HEALTH DECLARATION",
    healthIntro: "I declare that I have not omitted any health information, including:",
    section3: "3. INFORMED CONSENT TERM",
    consent:
      "I declare that I am aware of the risks inherent to permanent procedures (pain, swelling, bruising), the difficulties involving the removal process, and the necessary aftercare.",
    authorize: (p) => `I authorize the professional ${p || BLANK} to perform the work.`,
    section4: "4. LIABILITY TERM",
    liability:
      "BRAZILIAN INK TATTOO is not responsible for services and procedures performed by VISITING TATTOO ARTISTS and BODY PIERCERS, since we have no control over how they perform their work at their places of origin. The studio's responsibility is limited solely to the rental of the space used for the appointment.",
    signature: "Client Signature",
  },
  espanhol: {
    title: "FORMULARIO DE CONSENTIMIENTO Y REGISTRO (FICHA DE ANAMNESIS)",
    subtitle: "1. IDENTIFICACIÓN DEL CLIENTE",
    section1: "IDENTIFICACIÓN DEL CLIENTE",
    name: "Nombre:",
    cpf: "Cédula de identidad/Cédula fiscal:",
    address: "Dirección:",
    cep: "Código postal:",
    birthDate: "Fecha de nacimiento:",
    phone: "Teléfono:",
    procedure: "Procedimiento:",
    tattoo: "Tatuaje",
    piercing: "Perforación",
    section2: "2. DECLARACIÓN DE SALUD",
    healthIntro: "Declaro que no he omitido ninguna información sobre mi salud, incluyendo:",
    section3: "3. CONSENTIMIENTO INFORMADO",
    consent:
      "Declaro que estoy al tanto de los riesgos inherentes a los procedimientos permanentes (dolor, hinchazón, hematomas), las dificultades que implica el proceso de remoción y los cuidados posteriores necesarios.",
    authorize: (p) => `Autorizo al profesional ${p || BLANK} a realizar el trabajo.`,
    section4: "4. TÉRMINO DE RESPONSABILIDAD",
    liability:
      "BRAZILIAN INK TATTOO no se responsabiliza por los servicios y procedimientos realizados por TATUADORES y BODY PIERCERS VISITANTES, ya que no tenemos control sobre cómo realizan su trabajo en sus lugares de origen. La responsabilidad del estudio se limita únicamente al alquiler del espacio destinado a la atención.",
    signature: "Firma del Cliente",
  },
};

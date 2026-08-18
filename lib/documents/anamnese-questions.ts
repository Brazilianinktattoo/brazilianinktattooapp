// Perguntas extraídas fielmente do modelo real
// Ficha_Anamnese_BIT_Completa_RJ.docx — separado do renderizador de PDF
// (lib/documents/anamnese.ts) porque esse último importa pdfkit, que não
// pode entrar no bundle do cliente; este arquivo é seguro pra componente
// "use client" importar.
export const ANAMNESE_HEALTH_QUESTIONS: { key: string; label: string }[] = [
  { key: "heart_disease", label: "Possui alguma doença cardíaca?" },
  { key: "diabetic", label: "É diabético(a)?" },
  { key: "hemophilia", label: "Possui hemofilia ou outro distúrbio de coagulação?" },
  { key: "anticoagulants", label: "Faz uso de anticoagulantes, AAS ou Aspirina?" },
  { key: "keloid", label: "Possui histórico de queloide ou cicatrização anormal?" },
  { key: "autoimmune", label: "Possui alguma doença autoimune?" },
  { key: "epilepsy", label: "É epilético(a) ou possui histórico de convulsões?" },
  {
    key: "allergy",
    label: "Possui alergia a látex, tintas, metais, anestésicos tópicos ou iodo?",
  },
  {
    key: "infectious",
    label: "Já teve ou tem Hepatite B, Hepatite C, HIV ou outra doença infectocontagiosa?",
  },
  { key: "medication", label: "Faz uso de medicação contínua?" },
];

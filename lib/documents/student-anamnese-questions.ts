// Perguntas extraídas fielmente do modelo Ficha_Anamnese_Alunos_BIT.docx —
// separado do renderizador de PDF (lib/documents/student-anamnese.ts)
// porque esse último importa pdfkit, que não pode entrar no bundle do
// cliente; este arquivo é seguro pra componente "use client" importar.
export const STUDENT_HEALTH_QUESTIONS: { key: string; label: string; detail?: boolean }[] = [
  { key: "fumante", label: "Fumante?" },
  { key: "alergia", label: "Alergia?", detail: true },
  { key: "gravida", label: "Grávida?" },
  { key: "menstruada", label: "Menstruada?" },
  { key: "herpes", label: "Possui herpes?" },
  { key: "queloide", label: "Queloide?" },
  { key: "diabetes", label: "Diabetes?" },
  { key: "epilepsia", label: "Epilepsia?" },
  { key: "cardiopata", label: "Cardiopata?" },
  { key: "anemia", label: "Anemia?" },
  { key: "hemofilia", label: "Hemofilia?" },
  { key: "depressao", label: "Depressão?" },
  { key: "vitiligo", label: "Vitiligo?" },
  { key: "hiv", label: "Portador de HIV?" },
  { key: "marcapasso", label: "Marcapasso?" },
  { key: "hepatite", label: "Hepatite?" },
  { key: "pressao", label: "Hipo/Hipertensão?" },
  { key: "autoimune", label: "Doença autoimune?" },
  { key: "alimentou", label: "Alimentou-se nas últimas 24h?" },
  { key: "drogas_alcool", label: "Está sob efeito de drogas/álcool?" },
  { key: "pele_bronzeada", label: "Está com a pele bronzeada?" },
  { key: "cancer", label: "Possui algum tipo de câncer?", detail: true },
  { key: "cicatrizacao", label: "Problema de pele/cicatrização?", detail: true },
  { key: "medicamento", label: "Faz uso de medicamento diário?", detail: true },
  { key: "tratamento_medico", label: "Está em tratamento médico?", detail: true },
  { key: "doenca_transmissivel", label: "Possui doença transmissível?", detail: true },
  { key: "outro_problema", label: "Possui algum problema de saúde não citado?", detail: true },
];

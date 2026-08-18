// Perguntas extraídas fielmente do modelo real
// Autorização Piercing para menores.docx — separado do renderizador de PDF
// (lib/documents/minor-authorization.ts) porque esse último importa pdfkit,
// que não pode entrar no bundle do cliente.
export const MINOR_HEALTH_QUESTIONS: { key: string; label: string }[] = [
  { key: "healing_problems", label: "Tem problemas de cicatrização?" },
  { key: "diabetic", label: "É diabética(o)?" },
  { key: "fainting", label: "Tem problemas de desmaio?" },
  { key: "hemophiliac", label: "É hemofílica(o)?" },
  { key: "hepatitis", label: "Já contraiu hepatite? Qual o tipo? Quando?" },
  { key: "anemia", label: "Tem ou teve anemia?" },
  { key: "epileptic", label: "É epilética(o)?" },
];

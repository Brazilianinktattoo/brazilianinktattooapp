import type { CourseType, CourseEnrollment, EnrollmentStatus } from "@/lib/types/database";

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  tatuagem_iniciante: "Curso de Tatuagem Iniciante",
  tatuagem_especializacao: "Curso de Especialização em Tatuagem",
  piercing_iniciante: "Curso de Piercing Iniciante",
  piercing_especializacao: "Curso de Especialização em Piercing",
};

export const COURSE_TYPES = Object.keys(COURSE_TYPE_LABELS) as CourseType[];

// Estados que realmente ocupam vaga (contam pra lotação da turma).
export const SEAT_HOLDING_STATUSES: EnrollmentStatus[] = [
  "inscrito",
  "matriculado",
  "convocado",
];

export const WITHDRAWAL_DAYS = 7;

export const WITHDRAWAL_CLAUSE =
  "Você tem 7 dias corridos após a inscrição para desistir com devolução " +
  "integral do sinal. Após esse prazo, o sinal (reserva de vaga) não é " +
  "reembolsável, pois cobre custos administrativos e de reserva de material.";

export function withdrawalDeadline(signedUpAt: string) {
  const d = new Date(signedUpAt);
  d.setUTCDate(d.getUTCDate() + WITHDRAWAL_DAYS);
  return d;
}

export function isPastWithdrawalWindow(signedUpAt: string) {
  return Date.now() > withdrawalDeadline(signedUpAt).getTime();
}

// "confirmado" nunca é gravado no banco — é 'inscrito' + prazo de
// arrependimento vencido. Evita precisar de job agendado só pra flipar o
// status quando os 7 dias passam.
export function displayStatus(
  enrollment: Pick<CourseEnrollment, "status" | "signed_up_at">
): EnrollmentStatus | "confirmado" {
  if (enrollment.status === "inscrito" && isPastWithdrawalWindow(enrollment.signed_up_at)) {
    return "confirmado";
  }
  return enrollment.status;
}

export const STATUS_LABELS: Record<EnrollmentStatus | "confirmado", string> = {
  inscrito: "Inscrito",
  confirmado: "Confirmado",
  lista_espera: "Lista de espera",
  convocado: "Convocado (aguardando confirmação)",
  matriculado: "Matriculado",
  desistente: "Desistente",
};

export function depositAmount(priceTotal: number, depositPercentage: number) {
  return Math.round(priceTotal * (depositPercentage / 100) * 100) / 100;
}

export function contractTemplate(params: {
  studentName: string;
  studentCpf: string;
  courseLabel: string;
  className: string;
  priceTotal: number;
  depositPercentage: number;
}) {
  const { studentName, studentCpf, courseLabel, className, priceTotal, depositPercentage } =
    params;
  const deposit = depositAmount(priceTotal, depositPercentage);
  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS

CONTRATANTE: ${studentName}${studentCpf ? ` — CPF ${studentCpf}` : ""}
CONTRATADA: Brazilian Ink Tattoo
CURSO: ${courseLabel}
TURMA: ${className}
VALOR TOTAL DO CURSO: ${money(priceTotal)}
SINAL (RESERVA DE VAGA): ${money(deposit)} (${depositPercentage}% do valor total)

CLÁUSULA DE ARREPENDIMENTO
${WITHDRAWAL_CLAUSE}

Demais condições a combinar entre as partes.`;
}

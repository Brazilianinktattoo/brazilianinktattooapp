import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { COURSE_TYPE_LABELS, SEAT_HOLDING_STATUSES } from "@/lib/cursos";
import { getCourseClassOrNotFound } from "./get-course-class";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CourseClassPage(
  props: PageProps<"/cursos/[tipo]/turmas/[turmaId]">
) {
  const { tipo, turmaId } = await props.params;
  await requireAdmin();
  const { supabase, courseType, courseClass } = await getCourseClassOrNotFound(
    tipo,
    turmaId
  );

  const { data: enrollments } = await supabase
    .from("course_enrollments")
    .select("status")
    .eq("course_class_id", courseClass.id);

  const list = enrollments ?? [];
  const occupied = list.filter((e) => SEAT_HOLDING_STATUSES.includes(e.status)).length;
  const waitlisted = list.filter((e) => e.status === "lista_espera").length;
  const inscritos = list.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/cursos/${courseType}`}
          className="text-sm text-neutral-500 hover:text-white"
        >
          ← {COURSE_TYPE_LABELS[courseType]}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">{courseClass.name}</h1>
        <p className="text-neutral-400">
          {occupied}/{courseClass.max_seats} vagas ocupadas ·{" "}
          {formatMoney(courseClass.price_total)} · sinal {courseClass.deposit_percentage}%
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}/inscricao`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
        >
          <h2 className="font-semibold text-white">Ficha de Inscrição</h2>
          <p className="mt-1 text-sm text-neutral-400">
            {inscritos} inscrição(ões) · gerar link para lead
          </p>
        </Link>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}/contrato`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
        >
          <h2 className="font-semibold text-white">Contrato</h2>
          <p className="mt-1 text-sm text-neutral-400">Gerar ou anexar por aluno</p>
        </Link>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}/pagamento`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
        >
          <h2 className="font-semibold text-white">Controle de Pagamento</h2>
          <p className="mt-1 text-sm text-neutral-400">Sinal, pagamento final e status</p>
        </Link>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}/lista-espera`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
        >
          <h2 className="font-semibold text-white">Lista de Espera</h2>
          <p className="mt-1 text-sm text-neutral-400">{waitlisted} na fila</p>
        </Link>
      </div>
    </div>
  );
}

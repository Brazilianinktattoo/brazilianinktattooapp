import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { COURSE_TYPE_LABELS } from "@/lib/cursos";
import { hasContractTemplate } from "@/lib/contracts/course-contract";
import type { CourseContract, CourseEnrollment } from "@/lib/types/database";
import { getCourseClassOrNotFound } from "../get-course-class";
import { ContractCard } from "./contract-card";
import { AutoContractCard } from "./auto-contract-card";

export default async function ContratoPage(
  props: PageProps<"/cursos/[tipo]/turmas/[turmaId]/contrato">
) {
  const { tipo, turmaId } = await props.params;
  await requireAdmin();
  const { supabase, courseType, courseClass } = await getCourseClassOrNotFound(
    tipo,
    turmaId
  );

  const { data: enrollments } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_class_id", courseClass.id)
    .neq("status", "lista_espera")
    .order("signed_up_at", { ascending: true })
    .returns<CourseEnrollment[]>();

  const list = enrollments ?? [];
  const ids = list.map((e) => e.id);

  const { data: contracts } = ids.length
    ? await supabase
        .from("course_contracts")
        .select("*")
        .in("enrollment_id", ids)
        .returns<CourseContract[]>()
    : { data: [] as CourseContract[] };

  const contractByEnrollment = new Map((contracts ?? []).map((c) => [c.enrollment_id, c]));
  const hasAutoTemplate = hasContractTemplate(courseType);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}`}
          className="text-sm text-neutral-500 hover:text-white"
        >
          ← {courseClass.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Contrato</h1>
        <p className="text-neutral-400">
          {hasAutoTemplate
            ? "Gere o contrato preenchido automaticamente com os dados da ficha de inscrição e envie o link de assinatura pro aluno."
            : "Gere o texto do contrato (já com a cláusula de arrependimento) ou anexe o contrato assinado por aluno."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((e) =>
          hasAutoTemplate ? (
            <AutoContractCard
              key={e.id}
              enrollment={e}
              contract={contractByEnrollment.get(e.id) ?? null}
            />
          ) : (
            <ContractCard
              key={e.id}
              enrollment={e}
              contract={contractByEnrollment.get(e.id) ?? null}
              courseLabel={COURSE_TYPE_LABELS[courseType]}
              className={courseClass.name}
              priceTotal={courseClass.price_total}
              depositPercentage={courseClass.deposit_percentage}
            />
          )
        )}
        {list.length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
            Nenhum aluno com vaga confirmada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

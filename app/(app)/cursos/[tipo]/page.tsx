import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COURSE_TYPES, COURSE_TYPE_LABELS, SEAT_HOLDING_STATUSES } from "@/lib/cursos";
import type { CourseClass, CourseType } from "@/lib/types/database";
import { NewClassForm } from "./new-class-form";
import { ClassRow } from "./class-row";

export default async function CourseTypePage(
  props: PageProps<"/cursos/[tipo]">
) {
  const { tipo } = await props.params;
  if (!COURSE_TYPES.includes(tipo as CourseType)) notFound();
  const courseType = tipo as CourseType;

  await requireAdmin();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("course_classes")
    .select("*")
    .eq("course_type", courseType)
    .order("created_at", { ascending: false })
    .returns<CourseClass[]>();

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: enrollments } = classIds.length
    ? await supabase
        .from("course_enrollments")
        .select("course_class_id, status")
        .in("course_class_id", classIds)
    : { data: [] };

  const occupiedByClass = new Map<string, number>();
  for (const e of enrollments ?? []) {
    if (SEAT_HOLDING_STATUSES.includes(e.status)) {
      occupiedByClass.set(e.course_class_id, (occupiedByClass.get(e.course_class_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cursos" className="text-sm text-neutral-500 hover:text-white">
          ← Cursos
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          {COURSE_TYPE_LABELS[courseType]}
        </h1>
        <p className="text-neutral-400">
          Cada turma tem suas próprias vagas, inscrições, contrato, pagamento
          e lista de espera.
        </p>
      </div>

      <NewClassForm courseType={courseType} />

      <div className="flex flex-col gap-2">
        {(classes ?? []).map((c) => (
          <ClassRow
            key={c.id}
            courseType={courseType}
            courseClass={c}
            occupied={occupiedByClass.get(c.id) ?? 0}
          />
        ))}
        {(classes ?? []).length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
            Nenhuma turma criada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

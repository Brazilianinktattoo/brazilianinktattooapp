import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COURSE_TYPES, COURSE_TYPE_LABELS } from "@/lib/cursos";
import type { CourseClass } from "@/lib/types/database";

export default async function CursosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("course_classes")
    .select("*")
    .returns<CourseClass[]>();

  const list = classes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Cursos</h1>
        <p className="text-neutral-400">
          Turmas, inscrições, contrato, pagamento e lista de espera dos cursos
          de tatuagem e piercing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COURSE_TYPES.map((tipo) => {
          const turmasDoTipo = list.filter((c) => c.course_type === tipo);
          const ativas = turmasDoTipo.filter((c) => c.active).length;
          return (
            <Link
              key={tipo}
              href={`/cursos/${tipo}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
            >
              <h2 className="font-semibold text-white">
                {COURSE_TYPE_LABELS[tipo]}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {turmasDoTipo.length === 0
                  ? "Nenhuma turma criada ainda."
                  : `${turmasDoTipo.length} turma(s) · ${ativas} ativa(s)`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

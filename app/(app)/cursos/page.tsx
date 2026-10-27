import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchCourses } from "@/lib/courses";
import type { CourseClass } from "@/lib/types/database";
import { CourseAdmin } from "./course-admin";

export default async function CursosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [courses, { data: classes }] = await Promise.all([
    fetchCourses(supabase),
    supabase.from("course_classes").select("*").returns<CourseClass[]>(),
  ]);
  const list = classes ?? [];
  const active = courses.filter((c) => c.active);

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
        {active.map((course) => {
          const turmas = list.filter((c) => c.course_type === course.slug);
          const ativas = turmas.filter((c) => c.active).length;
          return (
            <Link
              key={course.slug}
              href={`/cursos/${course.slug}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
            >
              <h2 className="font-semibold text-white">{course.name}</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {turmas.length === 0
                  ? "Nenhuma turma criada ainda."
                  : `${turmas.length} turma(s) · ${ativas} ativa(s)`}
              </p>
            </Link>
          );
        })}
      </div>

      <CourseAdmin courses={courses} />
    </div>
  );
}

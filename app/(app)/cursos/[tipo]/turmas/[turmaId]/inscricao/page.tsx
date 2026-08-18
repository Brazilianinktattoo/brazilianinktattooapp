import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABELS, displayStatus, withdrawalDeadline } from "@/lib/cursos";
import type { CourseEnrollment } from "@/lib/types/database";
import { getCourseClassOrNotFound } from "../get-course-class";
import { GenerateLinkForm } from "../generate-link-form";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function InscricaoPage(
  props: PageProps<"/cursos/[tipo]/turmas/[turmaId]/inscricao">
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
    .order("signed_up_at", { ascending: true })
    .returns<CourseEnrollment[]>();

  const list = enrollments ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}`}
          className="text-sm text-neutral-500 hover:text-white"
        >
          ← {courseClass.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Ficha de Inscrição</h1>
        <p className="text-neutral-400">
          Dados pessoais e contato de quem se inscreveu nesta turma.
        </p>
      </div>

      <GenerateLinkForm courseClassId={courseClass.id} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Nome</th>
              <th className="py-3 pr-4 font-medium">Contato</th>
              <th className="py-3 pr-4 font-medium">CPF / RG</th>
              <th className="py-3 pr-4 font-medium">Endereço</th>
              <th className="py-3 pr-4 font-medium">Inscrito em</th>
              <th className="py-3 pr-4 font-medium">Prazo de arrependimento</th>
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-b border-neutral-800 align-top">
                <td className="py-3 pl-4 pr-4 text-neutral-100">{e.full_name}</td>
                <td className="py-3 pr-4 text-neutral-300">
                  <div>{e.email}</div>
                  <div className="text-xs text-neutral-500">{e.phone}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-300">
                  <div>{e.cpf || "—"}</div>
                  <div className="text-xs text-neutral-500">{e.rg || "—"}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-300">
                  {e.address ? `${e.address} - ${e.state}` : "—"}
                </td>
                <td className="py-3 pr-4 text-neutral-300">{formatDate(e.signed_up_at)}</td>
                <td className="py-3 pr-4 text-neutral-300">
                  {formatDate(withdrawalDeadline(e.signed_up_at).toISOString())}
                </td>
                <td className="py-3 pr-4 text-neutral-300">{STATUS_LABELS[displayStatus(e)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">Nenhuma inscrição ainda.</p>
        )}
      </div>
    </div>
  );
}

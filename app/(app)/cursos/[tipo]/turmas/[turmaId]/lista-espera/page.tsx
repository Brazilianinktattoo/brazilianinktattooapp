import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/cursos";
import type { CourseEnrollment } from "@/lib/types/database";
import { getCourseClassOrNotFound } from "../get-course-class";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ListaEsperaPage(
  props: PageProps<"/cursos/[tipo]/turmas/[turmaId]/lista-espera">
) {
  const { tipo, turmaId } = await props.params;
  await requireAdmin();
  const { supabase, courseType, courseClass } = await getCourseClassOrNotFound(
    tipo,
    turmaId
  );

  const { data: waiting } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_class_id", courseClass.id)
    .eq("status", "lista_espera")
    .order("waitlist_position", { ascending: true })
    .returns<CourseEnrollment[]>();

  const { data: convocados } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_class_id", courseClass.id)
    .eq("status", "convocado")
    .order("updated_at", { ascending: false })
    .returns<CourseEnrollment[]>();

  const waitList = waiting ?? [];
  const convocadoList = convocados ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}`}
          className="text-sm text-neutral-500 hover:text-white"
        >
          ← {courseClass.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Lista de Espera</h1>
        <p className="text-neutral-400">
          Quando alguém com vaga desiste, o próximo daqui é chamado
          automaticamente e a equipe recebe uma notificação para entrar em
          contato.
        </p>
      </div>

      {convocadoList.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-500/10 p-4">
          <h2 className="font-semibold text-amber-300">
            Aguardando confirmação ({convocadoList.length})
          </h2>
          <p className="mt-1 text-sm text-amber-200/80">
            Vaga foi liberada para eles — falta a equipe confirmar e registrar
            o sinal em Controle de Pagamento.
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-200">
            {convocadoList.map((e) => (
              <li key={e.id}>
                {e.full_name} — {e.email} · {e.phone}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">#</th>
              <th className="py-3 pr-4 font-medium">Nome</th>
              <th className="py-3 pr-4 font-medium">Contato</th>
              <th className="py-3 pr-4 font-medium">Na fila desde</th>
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {waitList.map((e) => (
              <tr key={e.id} className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4 text-neutral-100">
                  {e.waitlist_position ?? "—"}
                </td>
                <td className="py-3 pr-4 text-neutral-100">{e.full_name}</td>
                <td className="py-3 pr-4 text-neutral-300">
                  <div>{e.email}</div>
                  <div className="text-xs text-neutral-500">{e.phone}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-300">{formatDate(e.signed_up_at)}</td>
                <td className="py-3 pr-4 text-neutral-300">{STATUS_LABELS[e.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {waitList.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Ninguém na lista de espera desta turma.
          </p>
        )}
      </div>
    </div>
  );
}

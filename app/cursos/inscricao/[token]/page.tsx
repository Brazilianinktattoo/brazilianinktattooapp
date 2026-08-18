import { createAdminClient } from "@/lib/supabase/server";
import { COURSE_TYPE_LABELS } from "@/lib/cursos";
import type { CourseClass, CourseSignupLink } from "@/lib/types/database";
import { SignupForm } from "./signup-form";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function CourseSignupPage(
  props: PageProps<"/cursos/inscricao/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("course_signup_links")
    .select("*")
    .eq("token", token)
    .maybeSingle<CourseSignupLink>();

  if (!link) {
    return (
      <Message
        title="Link inválido"
        body="Esse link de inscrição não existe ou não é mais válido. Confira com o estúdio."
      />
    );
  }

  if (link.used_at) {
    return (
      <Message
        title="Inscrição já enviada"
        body="Esse link já foi usado. Se precisar alterar algo, fale com o estúdio."
      />
    );
  }

  const { data: courseClass } = await admin
    .from("course_classes")
    .select("*")
    .eq("id", link.course_class_id)
    .maybeSingle<CourseClass>();

  if (!courseClass || !courseClass.active) {
    return (
      <Message
        title="Turma indisponível"
        body="Esta turma não está mais aceitando inscrições. Fale com o estúdio."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {COURSE_TYPE_LABELS[courseClass.course_type]}
        </h1>
        <p className="text-neutral-400">{courseClass.name}</p>
      </div>

      <SignupForm token={token} />
    </div>
  );
}

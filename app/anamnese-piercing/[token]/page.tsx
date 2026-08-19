import { createAdminClient } from "@/lib/supabase/server";
import { getFormText } from "@/lib/form-texts";
import type { StudentAnamneseForm } from "@/lib/types/database";
import { StudentAnamneseForm as StudentAnamneseFormComponent } from "./student-anamnese-form";

const DEFAULT_CONSENT_TEXT =
  "Declaro que as informações acima são verdadeiras, não cabendo ao profissional quaisquer responsabilidades por informações omitidas nessa avaliação. Declaro ser de minha espontânea vontade a realização da tatuagem/piercing no local aqui descrito. Estou ciente de que o procedimento é de caráter permanente (quando aplicável) e das dificuldades de uma remoção. Comprometo-me a seguir todos os cuidados necessários após o procedimento.";

const DEFAULT_PHOTO_TEXT =
  "Autorizo o registro fotográfico do trabalho realizado (antes/depois) para efeitos de documentação e divulgação em redes sociais ou qualquer material publicitário. A presente autorização é concedida gratuitamente, sem que nada haja a ser reclamado a título ou qualquer outro.";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function StudentAnamnesePage(
  props: PageProps<"/anamnese-piercing/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("student_anamnese_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<StudentAnamneseForm>();

  if (!form) {
    return (
      <Message
        title="Link inválido"
        body="Esse link de ficha de anamnese não existe. Fale com o estúdio."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {form.signed_at ? "Ficha já preenchida" : "Ficha de Anamnese de Piercing"}
        </h1>
      </div>

      {form.signed_at ? (
        <div className="rounded-xl border border-green-800 bg-green-500/10 p-4 text-center text-green-300">
          Preenchida em{" "}
          {new Date(form.signed_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </div>
      ) : (
        <StudentAnamneseFormComponent
          token={token}
          consentText={await getFormText("student_anamnese_consent", DEFAULT_CONSENT_TEXT)}
          photoAuthorizationText={await getFormText(
            "student_anamnese_photo_authorization",
            DEFAULT_PHOTO_TEXT
          )}
        />
      )}
    </div>
  );
}

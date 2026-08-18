import { createAdminClient } from "@/lib/supabase/server";
import type { CoworkingAnamneseForm } from "@/lib/types/database";
import { TEXT } from "@/lib/documents/coworking-anamnese-content";
import { CoworkingAnamneseForm as CoworkingAnamneseFormComponent } from "./coworking-anamnese-form";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function AnamneseCoworkingPage(
  props: PageProps<"/anamnese-coworking/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("coworking_anamnese_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<CoworkingAnamneseForm>();

  if (!form) {
    return <Message title="Link inválido" body="Esse link não existe. Fale com o estúdio." />;
  }

  const t = TEXT[form.language];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {form.signed_at ? "—" : t.title}
        </h1>
        <p className="text-neutral-400">{t.subtitle}</p>
      </div>

      {form.signed_at ? (
        <div className="rounded-xl border border-green-800 bg-green-500/10 p-4 text-center text-green-300">
          {new Date(form.signed_at).toLocaleString("pt-BR")}
        </div>
      ) : (
        <CoworkingAnamneseFormComponent
          token={token}
          language={form.language}
          defaultName={form.full_name}
        />
      )}
    </div>
  );
}

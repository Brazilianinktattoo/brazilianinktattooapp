import { createAdminClient } from "@/lib/supabase/server";
import { getFormText } from "@/lib/form-texts";
import { DEFAULT_LOBULOPLASTIA_CONSENT_TEXT } from "@/lib/documents/lobuloplastia-questions";
import type { LobuloplastiaForm } from "@/lib/types/database";
import { LobuloplastiaFormComponent } from "./lobuloplastia-form";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function LobuloplastiaSignPage(
  props: PageProps<"/lobuloplastia/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("lobuloplastia_forms")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle<LobuloplastiaForm>();

  if (!form) {
    return (
      <Message
        title="Link inválido"
        body="Esse link de ficha de lobuloplastia não existe. Fale com o estúdio."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {form.signed_at ? "Ficha já preenchida" : "Ficha de Lobuloplastia"}
        </h1>
        <p className="text-neutral-400">{form.full_name}</p>
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
        <LobuloplastiaFormComponent
          token={token}
          defaultName={form.full_name}
          defaultPhone={form.phone}
          consentText={await getFormText("lobuloplastia_consent_text", DEFAULT_LOBULOPLASTIA_CONSENT_TEXT)}
        />
      )}
    </div>
  );
}

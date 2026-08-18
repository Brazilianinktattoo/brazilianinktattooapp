import { createAdminClient } from "@/lib/supabase/server";
import type { AnamneseForm } from "@/lib/types/database";
import { AnamneseForm as AnamneseFormComponent } from "./anamnese-form";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function AnamnesePage(
  props: PageProps<"/anamnese/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("anamnese_forms")
    .select("*, appointment:appointments(client_name, client_phone)")
    .eq("sign_token", token)
    .maybeSingle<
      AnamneseForm & { appointment: { client_name: string; client_phone: string } | null }
    >();

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
          {form.signed_at ? "Ficha já preenchida" : "Ficha de anamnese"}
        </h1>
        <p className="text-neutral-400">{form.appointment?.client_name}</p>
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
        <AnamneseFormComponent
          token={token}
          defaultName={form.appointment?.client_name ?? ""}
          defaultPhone={form.appointment?.client_phone ?? ""}
        />
      )}
    </div>
  );
}

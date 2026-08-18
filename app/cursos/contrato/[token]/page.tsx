import { createAdminClient } from "@/lib/supabase/server";
import type { CourseContract } from "@/lib/types/database";
import { SignatureForm } from "./signature-form";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function ContractSignPage(
  props: PageProps<"/cursos/contrato/[token]">
) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("course_contracts")
    .select("*, enrollment:course_enrollments(full_name)")
    .eq("sign_token", token)
    .maybeSingle<CourseContract & { enrollment: { full_name: string } | null }>();

  if (!contract || !contract.file_path) {
    return (
      <Message
        title="Link inválido"
        body="Esse link de contrato não existe ou o contrato ainda não foi gerado. Fale com o estúdio."
      />
    );
  }

  const { data: signedUrlData } = await admin.storage
    .from("contratos")
    .createSignedUrl(contract.file_path, 60 * 15);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {contract.signed ? "Contrato assinado" : "Revise e assine seu contrato"}
        </h1>
        <p className="text-neutral-400">
          {contract.enrollment?.full_name}
        </p>
      </div>

      {signedUrlData?.signedUrl && (
        <iframe
          src={signedUrlData.signedUrl}
          className="h-[70vh] w-full rounded-xl border border-neutral-800 bg-white"
          title="Contrato"
        />
      )}

      {contract.signed ? (
        <div className="rounded-xl border border-green-800 bg-green-500/10 p-4 text-center text-green-300">
          Assinado{" "}
          {contract.signed_at &&
            `em ${new Date(contract.signed_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}`}
          .
        </div>
      ) : (
        <SignatureForm token={token} defaultName={contract.enrollment?.full_name ?? ""} />
      )}
    </div>
  );
}

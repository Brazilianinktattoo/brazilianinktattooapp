import { createAdminClient } from "@/lib/supabase/server";
import type { CourseReceipt } from "@/lib/types/database";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <p className="text-neutral-400">{body}</p>
    </div>
  );
}

export default async function ReciboPage(props: PageProps<"/recibo/[token]">) {
  const { token } = await props.params;
  const admin = createAdminClient();

  const { data: receipt } = await admin
    .from("course_receipts")
    .select("*")
    .eq("access_token", token)
    .maybeSingle<CourseReceipt>();

  if (!receipt || !receipt.file_path) {
    return (
      <Message
        title="Link inválido"
        body="Esse link de recibo não existe. Fale com o estúdio."
      />
    );
  }

  const { data: signedUrlData } = await admin.storage
    .from("documentos")
    .createSignedUrl(receipt.file_path, 60 * 15);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Recibo de pagamento</h1>
      {signedUrlData?.signedUrl && (
        <iframe
          src={signedUrlData.signedUrl}
          className="h-[70vh] w-full rounded-xl border border-neutral-800 bg-white"
          title="Recibo"
        />
      )}
    </div>
  );
}

import { createAdminClient } from "@/lib/supabase/server";
import { getFormText } from "@/lib/form-texts";
import type { Profile } from "@/lib/types/database";
import { WalkinAnamneseForm } from "./walkin-anamnese-form";

// URL fixa (QR Code) sem parâmetro dinâmico — sem isso o Next prerenderia
// a lista de profissionais uma vez no build e nunca mais atualizaria,
// mesmo com o Admin editando quem aparece.
export const dynamic = "force-dynamic";

const DEFAULT_CONSENT_TEXT =
  "Declaro estar ciente de que o procedimento envolve o rompimento da barreira natural da pele, com riscos inerentes de dor, edema, hematoma, sangramento, reação alérgica e infecção. Fui informado(a) sobre os cuidados pós-procedimento necessários e sobre a dificuldade do processo de remoção, quando aplicável. Declaro que as informações de saúde acima são verdadeiras e completas.";

export default async function AnamneseNovoPage() {
  const admin = createAdminClient();
  const { data: professionals } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["tatuador", "piercer", "chefe_piercing"])
    .eq("active", true)
    .eq("qr_anamnese_enabled", true)
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name" | "role">[]>();

  const consentText = await getFormText("anamnese_bit_consent", DEFAULT_CONSENT_TEXT);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Ficha de Anamnese</h1>
        <p className="text-neutral-400">
          Preencha seus dados e escolha o profissional que vai te atender.
        </p>
      </div>

      <WalkinAnamneseForm
        professionals={professionals ?? []}
        consentText={consentText}
      />
    </div>
  );
}

import { requireProfile } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function MinhaContaPage() {
  const { profile } = await requireProfile();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">
          Minha conta
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {profile.full_name || "Sem nome"} · {profile.email}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-300">
          Trocar senha
        </h2>
        <PasswordForm />
      </div>
    </div>
  );
}

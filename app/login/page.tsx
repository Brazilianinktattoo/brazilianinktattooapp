import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/icons/icon-192.png"
            alt="Brazilian Ink Tattoo"
            width={64}
            height={64}
            className="rounded-xl"
          />
          <div>
            <h1 className="text-lg font-semibold text-white">
              Brazilian Ink Tattoo
            </h1>
            <p className="text-sm text-neutral-400">
              Acesso do estúdio — faça login com seu usuário
            </p>
          </div>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}

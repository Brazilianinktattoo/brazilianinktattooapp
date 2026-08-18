import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-neutral-950 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.1]"
      >
        <Image
          src="/icons/logo-mark-transparent.png"
          alt=""
          width={1200}
          height={812}
          className="h-[105vmin] w-[105vmin] object-contain"
        />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gold-soft/30 bg-neutral-900/40 p-8 shadow-[0_0_40px_-12px_rgba(201,169,97,0.25)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/icons/logo-wordmark.png"
            alt="Brazilian Ink Tattoo"
            width={1600}
            height={1083}
            priority
            className="h-24 w-auto"
          />
          <p className="text-sm text-neutral-400">
            Acesso do estúdio — faça login com seu usuário
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}

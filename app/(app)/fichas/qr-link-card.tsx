"use client";

export function QrLinkCard({ isAdmin }: { isAdmin: boolean }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/anamnese/novo` : "";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-5 sm:col-span-2">
      <h2 className="font-medium text-white">
        Ficha de Anamnese — Link Fixo (QR Code)
      </h2>
      <p className="text-sm text-neutral-400">
        Link único e permanente — dá pra gerar um QR Code impresso com ele.
        O cliente preenche a ficha e escolhe o profissional que vai atendê-lo
        numa lista; o cadastro dele já entra automaticamente no CRM daquele
        profissional.
        {isAdmin && " Quem aparece na lista é controlado em Colaboradores (\"Na ficha por QR Code\")."}
      </p>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
      />
    </div>
  );
}

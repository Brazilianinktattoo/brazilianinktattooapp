import { requireClientRegistrar } from "@/lib/auth";
import { NewClientForm } from "../clientes/new-client-form";

export default async function CadastroClientePage() {
  await requireClientRegistrar();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Cadastro de Cliente</h1>
        <p className="text-neutral-400">
          Cadastre um novo cliente direto por aqui, sem precisar passar pela
          recepção — ele entra automaticamente no CRM do estúdio.
        </p>
      </div>

      <NewClientForm defaultOpen />
    </div>
  );
}

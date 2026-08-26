import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types/database";
import { NewServiceForm } from "./new-service-form";
import { ServiceRow } from "./service-row";

export default async function ServicosPage() {
  const { profile } = await requireAdminOrChefePiercing();
  const isChefePiercing = profile.role === "chefe_piercing";
  const supabase = await createClient();

  let query = supabase
    .from("services")
    .select("*")
    .order("category")
    .order("subcategory")
    .order("name");
  if (isChefePiercing) query = query.eq("category", "piercing");
  const { data: services } = await query.returns<Service[]>();

  const list = services ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {isChefePiercing ? "Serviços de piercing" : "Serviços"}
        </h1>
        <p className="text-neutral-400">
          Preço editável a qualquer momento — reajustar aqui não muda o valor
          de comandas já lançadas, só o preço padrão pras próximas.
        </p>
      </div>

      <NewServiceForm restrictToPiercing={isChefePiercing} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Serviço</th>
              <th className="py-3 pr-4 font-medium">Preço (R$)</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum serviço cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

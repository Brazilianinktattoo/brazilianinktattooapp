import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { JewelryCatalogItem } from "@/lib/types/database";
import { NewJewelryForm } from "./new-jewelry-form";
import { JewelryRow } from "./jewelry-row";

export default async function JoiasPage(props: PageProps<"/joias">) {
  const searchParams = await props.searchParams;
  await requireAdminOrChefePiercing();
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const supabase = await createClient();

  let query = supabase.from("jewelry_catalog").select("*").order("name");
  if (q) {
    query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,category.ilike.%${q}%`);
  }
  const { data: items } = await query.returns<JewelryCatalogItem[]>();

  const list = items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Jóias</h1>
        <p className="text-neutral-400">
          Catálogo e estoque, válido pras duas unidades (Downtown e Barra
          Shopping) — gerenciado pelo Chefe de Piercing. Aplicação/Troca/Venda
          são os valores usados ao lançar a jóia numa comanda.
        </p>
      </div>

      <NewJewelryForm />

      <form className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-sm text-neutral-300">
            Buscar por nome, código ou categoria
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-2 font-medium">Jóia</th>
              <th className="py-3 pr-2 font-medium">Código</th>
              <th className="py-3 pr-2 font-medium">Cód. barras</th>
              <th className="py-3 pr-2 font-medium">Categoria</th>
              <th className="py-3 pr-2 font-medium">Material</th>
              <th className="py-3 pr-2 font-medium">Estoque</th>
              <th className="py-3 pr-2 font-medium">Custo</th>
              <th className="py-3 pr-2 font-medium">Venda</th>
              <th className="py-3 pr-2 font-medium">Aplicação</th>
              <th className="py-3 pr-4 font-medium">Troca</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <JewelryRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            {q ? "Nenhuma jóia encontrada." : "Nenhuma jóia cadastrada ainda."}
          </p>
        )}
      </div>
    </div>
  );
}

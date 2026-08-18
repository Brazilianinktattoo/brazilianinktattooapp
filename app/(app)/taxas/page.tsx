import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CardFeeRate } from "@/lib/types/database";
import { ratesToCurrentMap, INSTALLMENT_OPTIONS } from "@/lib/fees";
import { FeeCalculator } from "./fee-calculator";
import { AddFeeRateForm } from "./add-fee-rate-form";

export default async function TaxasPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: rates } = await supabase
    .from("card_fee_rates")
    .select("*")
    .order("effective_from", { ascending: false })
    .returns<CardFeeRate[]>();

  const currentMap = ratesToCurrentMap(rates ?? []);
  const debitoRate = currentMap.get("debito:1") ?? null;
  const creditoRates = INSTALLMENT_OPTIONS.map(
    (i) => currentMap.get(`credito:${i}`) ?? null
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Taxas da maquininha (Stone)
        </h1>
        <p className="text-neutral-400">
          Consulta liberada a todos. Só o Admin pode cadastrar uma taxa nova —
          o cálculo do valor líquido no fechamento da comanda usa sempre a
          taxa mais recente de cada modalidade/parcela.
        </p>
      </div>

      <FeeCalculator debitoRate={debitoRate} creditoRates={creditoRates} />

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Tabela vigente</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Modalidade</th>
                <th className="py-3 pr-4 font-medium">Taxa</th>
                <th className="py-3 pr-4 font-medium">Vigente desde</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4 text-neutral-100">Débito</td>
                <td className="py-3 pr-4 text-neutral-200">
                  {debitoRate ? `${debitoRate.rate_percent}%` : "não cadastrada"}
                </td>
                <td className="py-3 pr-4 text-neutral-400">
                  {debitoRate
                    ? new Date(debitoRate.effective_from).toLocaleString("pt-BR")
                    : "—"}
                </td>
              </tr>
              {INSTALLMENT_OPTIONS.map((i) => {
                const rate = creditoRates[i - 1];
                return (
                  <tr key={i} className="border-b border-neutral-800">
                    <td className="py-3 pl-4 pr-4 text-neutral-100">
                      Crédito {i}x
                    </td>
                    <td className="py-3 pr-4 text-neutral-200">
                      {rate ? `${rate.rate_percent}%` : "não cadastrada"}
                    </td>
                    <td className="py-3 pr-4 text-neutral-400">
                      {rate
                        ? new Date(rate.effective_from).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {profile.role === "admin" && <AddFeeRateForm />}
    </div>
  );
}

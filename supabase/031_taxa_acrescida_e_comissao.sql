-- Brazilian Ink Tattoo — dois ajustes financeiros:
-- 1) a taxa da operadora passa a ser ACRESCIDA ao valor do serviço (o
--    cliente paga o valor do serviço + a taxa), não mais descontada —
--    renomeia net_amount -> charged_amount pra refletir o novo sentido
--    (valor cobrado do cliente, maior que o valor bruto do serviço).
-- 2) nenhuma tabela nova pra notificação de comissão — reaproveita
--    public.notifications já existente (inserida via service role a
--    partir da action de fechar comanda).
-- Rode depois do supabase/030_anamnese_alunos.sql.

alter table public.comandas rename column net_amount to charged_amount;

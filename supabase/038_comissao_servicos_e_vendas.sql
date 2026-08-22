-- Divide a comissão de Chefe de Piercing/Body Piercer em duas taxas
-- independentes: sobre serviços (perfuração — reaproveita profiles.
-- commission_rate, já existente) e sobre vendas (jóias). null em ambas
-- mantém o comportamento anterior (serviço = regra automática por
-- unidade/origem do cliente; venda de jóia = sem comissão).
alter table public.profiles
  add column if not exists commission_rate_sales numeric(4, 3);

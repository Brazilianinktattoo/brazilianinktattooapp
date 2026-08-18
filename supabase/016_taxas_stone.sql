-- Brazilian Ink Tattoo — Fase 8: taxas da maquininha (Stone) + valor líquido
-- Rode depois do supabase/015_mensagens.sql.

-- 1. Tabela de taxas: ledger insert-only (nunca update/delete) — cada edição
-- do admin vira uma linha nova com effective_from = agora, o que preserva o
-- histórico de quando cada taxa mudou (necessário pro DRE comparar meses).
create table if not exists public.card_fee_rates (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('debito', 'credito')),
  installments integer not null default 1 check (installments >= 1 and installments <= 18),
  rate_percent numeric(5, 2) not null check (rate_percent >= 0),
  effective_from timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint card_fee_rates_debito_single_installment
    check (method <> 'debito' or installments = 1)
);

create index if not exists card_fee_rates_lookup_idx
  on public.card_fee_rates (method, installments, effective_from desc);

alter table public.card_fee_rates enable row level security;

-- consulta liberada a qualquer colaborador logado (usado na calculadora)
drop policy if exists card_fee_rates_select_authenticated on public.card_fee_rates;
create policy card_fee_rates_select_authenticated
  on public.card_fee_rates for select
  to authenticated
  using (true);

-- só admin cadastra taxa nova (não existe update/delete — "editar" = inserir
-- uma linha nova que passa a valer a partir de agora)
drop policy if exists card_fee_rates_insert_admin on public.card_fee_rates;
create policy card_fee_rates_insert_admin
  on public.card_fee_rates for insert
  to authenticated
  with check (public.is_admin());

-- valores de referência informados pelo estúdio (débito e crédito até 4x);
-- de 5x a 18x fica em aberto até o admin negociar e cadastrar os valores reais
insert into public.card_fee_rates (method, installments, rate_percent)
select 'debito', 1, 2.5
where not exists (select 1 from public.card_fee_rates where method = 'debito');

insert into public.card_fee_rates (method, installments, rate_percent)
select 'credito', i, 4.0
from generate_series(1, 4) as i
where not exists (
  select 1 from public.card_fee_rates where method = 'credito' and installments = i
);

-- 2. Fechamento da comanda: forma de pagamento + valor bruto/líquido
-- congelados no momento do fechamento (regime de competência — a data que
-- conta é a do atendimento/fechamento, não a de repasse da operadora).
alter table public.comandas
  add column if not exists payment_method text
    check (payment_method in ('credito', 'debito', 'pix', 'dinheiro', 'paypal')),
  add column if not exists installments integer not null default 1
    check (installments >= 1 and installments <= 18),
  add column if not exists fee_rate_percent numeric(5, 2) not null default 0,
  add column if not exists gross_amount numeric(10, 2),
  add column if not exists net_amount numeric(10, 2);

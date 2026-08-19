-- Brazilian Ink Tattoo — contas fixas (despesas recorrentes do estúdio).
-- Rode depois do supabase/026_catalogo_piercing.sql.
--
-- Cada linha é uma ocorrência de conta (mês a mês o admin edita/duplica) —
-- mesmo padrão simples de CRUD das outras telas (services, macas etc.), sem
-- motor de recorrência automática.

create table if not exists public.fixed_bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10, 2) not null default 0,
  due_date date,
  paid_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_fixed_bills_updated_at on public.fixed_bills;
create trigger set_fixed_bills_updated_at
  before update on public.fixed_bills
  for each row execute function public.set_updated_at();

alter table public.fixed_bills enable row level security;

drop policy if exists fixed_bills_admin_only on public.fixed_bills;
create policy fixed_bills_admin_only
  on public.fixed_bills for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Base inicial pedida pelo estúdio — valores/vencimentos de aluguel,
-- condomínio, luz, internet, IPTU e Simples Nacional ficam em aberto
-- (0 / sem data) até o admin preencher, os demais já têm valor conhecido.
insert into public.fixed_bills (name, amount) values
  ('Aluguel', 0),
  ('Condomínio', 0),
  ('Luz', 0),
  ('Internet', 0),
  ('IPTU', 0),
  ('Claude', 110.00),
  ('WAME', 32.00),
  ('Telefone do app', 15.00),
  ('Contador', 410.00),
  ('Simples Nacional', 0);

-- Brazilian Ink Tattoo — Fase 7: comissão por unidade/cliente próprio + Clientes
-- Rode depois do supabase/013_contratos_auto.sql.

-- 1. Comissão -----------------------------------------------------------------
-- Regra do estúdio (não é mais % fixo por colaborador):
--   Barra Shopping: sempre 50% pro colaborador, linear.
--   Downtown: 70% pro colaborador se o cliente for próprio dele (ele que
--     trouxe), senão 50% (cliente veio pelo estúdio).
-- O percentual em si fica hardcoded em lib/commission.ts (regra do negócio,
-- não configuração) — só precisamos saber, por agendamento, se o cliente é
-- próprio do colaborador.
alter table public.appointments
  add column if not exists client_is_own boolean not null default false;

comment on column public.appointments.client_is_own is
  'Cliente próprio do colaborador (ele que trouxe) — usado pra calcular comissão no Downtown (70% vs 50%).';

-- 2. Clientes -------------------------------------------------------------------
-- Cadastro simples, criado/atualizado automaticamente ao agendar (por
-- telefone). Base pra filtro de cliente nos relatórios e pras automações de
-- mensagem (aniversário, "não vem há X dias").
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  birthday date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- índice funcional pra achar aniversariantes do dia rápido
create index if not exists clients_birthday_idx
  on public.clients ((extract(month from birthday)), (extract(day from birthday)));

alter table public.clients enable row level security;

-- mesma equipe que já cria/edita agendamentos (todo mundo menos chefe de
-- piercing e visitante) também gerencia clientes
drop policy if exists clients_staff_all on public.clients;
create policy clients_staff_all
  on public.clients for all
  to authenticated
  using (not public.is_chefe_piercing() and not public.is_visitante())
  with check (not public.is_chefe_piercing() and not public.is_visitante());

-- 3. Vincular agendamentos a clientes -------------------------------------------
-- Nullable e além dos campos client_name/client_phone já existentes (não
-- substituem, só ganham um vínculo estável) — evita reescrever telas que já
-- leem esses campos direto.
alter table public.appointments
  add column if not exists client_id uuid references public.clients (id);

create index if not exists appointments_client_idx on public.appointments (client_id);

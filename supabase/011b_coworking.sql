-- Brazilian Ink Tattoo — coworking: acesso temporário pra tatuador visitante
-- Rode depois do supabase/011a_enum_visitante.sql (em um Run separado).
--
-- O visitante é um profile de verdade (role='visitante'), criado com uma
-- senha aleatória que nunca é mostrada a ninguém — só o servidor usa pra
-- autenticá-lo automaticamente quando ele abre o link do pass. Isso deixa
-- reaproveitar toda a estrutura de RLS/permissões já existente.

create or replace function public.is_visitante()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'visitante' and active
  );
$$;

-- 1. Passes de coworking -------------------------------------------------------

create table if not exists public.coworking_passes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id),
  unit_id uuid not null references public.units (id),
  maca_id uuid not null references public.macas (id),
  guest_name text not null,
  guest_contact text not null default '',
  -- credenciais do login sombra do visitante — nunca exibidas a ninguém,
  -- só lidas pelo servidor pra autenticar automaticamente via o link/token
  guest_email text not null unique,
  guest_password text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  fixed_fee numeric(10, 2) not null default 0,
  fixed_fee_period text not null default 'dia'
    check (fixed_fee_period in ('hora', 'dia', 'semana')),
  percentage numeric(5, 2) not null default 0
    check (percentage >= 0 and percentage <= 100),
  -- faturamento do visitante no período, lançado manualmente pelo admin
  reported_revenue numeric(10, 2) not null default 0,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coworking_passes_ends_after_starts check (ends_at > starts_at)
);

create index if not exists coworking_passes_maca_period_idx
  on public.coworking_passes (maca_id, starts_at, ends_at);

drop trigger if exists set_coworking_passes_updated_at on public.coworking_passes;
create trigger set_coworking_passes_updated_at
  before update on public.coworking_passes
  for each row execute function public.set_updated_at();

alter table public.coworking_passes enable row level security;

-- só admin gerencia os passes (a criação real usa service_role no server
-- action, pra também criar o login sombra do visitante)
drop policy if exists coworking_passes_admin on public.coworking_passes;
create policy coworking_passes_admin
  on public.coworking_passes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- o próprio visitante lê o próprio pass (unidade/maca/período, pra UI)
drop policy if exists coworking_passes_select_self on public.coworking_passes;
create policy coworking_passes_select_self
  on public.coworking_passes for select
  to authenticated
  using (profile_id = auth.uid());

-- 2. Agenda: visitante só vê/agenda dentro da própria maca+período ------------

drop policy if exists appointments_select_others on public.appointments;
create policy appointments_select_others
  on public.appointments for select
  to authenticated
  using (not public.is_chefe_piercing() and not public.is_visitante());

drop policy if exists appointments_select_visitante on public.appointments;
create policy appointments_select_visitante
  on public.appointments for select
  to authenticated
  using (
    exists (
      select 1 from public.coworking_passes cp
      where cp.profile_id = auth.uid()
        and cp.maca_id = appointments.maca_id
        and appointments.starts_at >= cp.starts_at
        and appointments.starts_at <= cp.ends_at
    )
  );

-- 3. Regra: maca/unidade do visitante vêm sempre do pass ativo, e o
-- horário precisa caber dentro do período reservado (isto também é o que
-- faz o acesso "expirar" — fora da janela, o insert/update falha).

create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  collaborator_role public.user_role;
  maca_unit_id uuid;
  pass_maca_id uuid;
  pass_unit_id uuid;
  pass_starts timestamptz;
  pass_ends timestamptz;
begin
  select role into collaborator_role
  from public.profiles
  where id = new.collaborator_id;

  if collaborator_role = 'piercer' and new.maca_id is not null then
    raise exception 'Body piercer nao utiliza maca.';
  end if;

  if collaborator_role = 'tatuador' and new.maca_id is null then
    raise exception 'Tatuador precisa escolher uma maca.';
  end if;

  if collaborator_role = 'visitante' then
    select maca_id, unit_id, starts_at, ends_at
      into pass_maca_id, pass_unit_id, pass_starts, pass_ends
    from public.coworking_passes
    where profile_id = new.collaborator_id
    order by created_at desc
    limit 1;

    if pass_maca_id is null or now() < pass_starts or now() > pass_ends then
      raise exception 'Acesso de coworking expirado ou nao encontrado.';
    end if;

    if new.starts_at < pass_starts or new.ends_at > pass_ends then
      raise exception 'Horario fora do periodo reservado para este acesso.';
    end if;

    new.maca_id := pass_maca_id;
    new.unit_id := pass_unit_id;
  end if;

  if new.maca_id is not null then
    select unit_id into maca_unit_id from public.macas where id = new.maca_id;
    if maca_unit_id is distinct from new.unit_id then
      raise exception 'A maca escolhida nao pertence a unidade selecionada.';
    end if;
  end if;

  return new;
end;
$$;

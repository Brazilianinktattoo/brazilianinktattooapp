-- Brazilian Ink Tattoo — Etapa 2: agenda (macas + agendamentos)
-- Rode depois do supabase/schema.sql, no mesmo SQL Editor.

-- 0. Necessário para os constraints de "sem sobreposição" abaixo -------------
create extension if not exists btree_gist;

-- 1. Macas -------------------------------------------------------------------

create table if not exists public.macas (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_macas_updated_at on public.macas;
create trigger set_macas_updated_at
  before update on public.macas
  for each row execute function public.set_updated_at();

alter table public.macas enable row level security;

drop policy if exists macas_select_authenticated on public.macas;
create policy macas_select_authenticated
  on public.macas for select
  to authenticated
  using (true);

drop policy if exists macas_write_admin on public.macas;
create policy macas_write_admin
  on public.macas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Agendamentos --------------------------------------------------------------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.profiles (id),
  -- só preenchido para agendamentos de tatuador; body piercer não usa maca
  maca_id uuid references public.macas (id),
  client_name text not null,
  client_phone text not null default '',
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmado'
    check (status in ('confirmado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at)
);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- body piercer nunca ocupa maca — regra de negócio garantida no banco,
-- não só na UI
create or replace function public.enforce_maca_by_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  collaborator_role public.user_role;
begin
  select role into collaborator_role
  from public.profiles
  where id = new.collaborator_id;

  if collaborator_role = 'piercer' and new.maca_id is not null then
    raise exception 'Body piercer não utiliza maca.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_maca_by_role_trigger on public.appointments;
create trigger enforce_maca_by_role_trigger
  before insert or update on public.appointments
  for each row execute function public.enforce_maca_by_role();

-- nenhum colaborador pode ter dois agendamentos confirmados no mesmo horário
alter table public.appointments
  drop constraint if exists appointments_no_overlap_per_collaborator;
alter table public.appointments
  add constraint appointments_no_overlap_per_collaborator
  exclude using gist (
    collaborator_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmado');

-- nenhuma maca pode ter dois agendamentos confirmados no mesmo horário
alter table public.appointments
  drop constraint if exists appointments_no_overlap_per_maca;
alter table public.appointments
  add constraint appointments_no_overlap_per_maca
  exclude using gist (
    maca_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmado' and maca_id is not null);

alter table public.appointments enable row level security;

-- todo colaborador logado vê a agenda inteira do estúdio
drop policy if exists appointments_select_authenticated on public.appointments;
create policy appointments_select_authenticated
  on public.appointments for select
  to authenticated
  using (true);

-- só cria agendamento para si mesmo, a menos que seja admin
drop policy if exists appointments_insert_own_or_admin on public.appointments;
create policy appointments_insert_own_or_admin
  on public.appointments for insert
  to authenticated
  with check (collaborator_id = auth.uid() or public.is_admin());

-- só edita/cancela o próprio agendamento, a menos que seja admin
drop policy if exists appointments_update_own_or_admin on public.appointments;
create policy appointments_update_own_or_admin
  on public.appointments for update
  to authenticated
  using (collaborator_id = auth.uid() or public.is_admin())
  with check (collaborator_id = auth.uid() or public.is_admin());

-- 3. Macas iniciais ------------------------------------------------------------
-- Ajuste a quantidade/nome como preferir (dá pra editar depois na tela Macas).
insert into public.macas (label)
select label from (values ('Maca 1'), ('Maca 2'), ('Maca 3')) as seed(label)
where not exists (select 1 from public.macas);

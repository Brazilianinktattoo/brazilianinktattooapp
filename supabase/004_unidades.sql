-- Brazilian Ink Tattoo — unidades (Downtown / Barra Shopping)
-- Rode depois do supabase/003_sinal.sql.
--
-- Pressupõe que public.appointments está vazia (ou só com dados de teste) no
-- momento de rodar isto — o unit_id novo é NOT NULL sem valor default. Se já
-- existirem agendamentos reais quando for rodar, avise que preciso ajustar
-- para fazer backfill antes de tornar a coluna obrigatória.

-- 1. Unidades -------------------------------------------------------------

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_units_updated_at on public.units;
create trigger set_units_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

alter table public.units enable row level security;

drop policy if exists units_select_authenticated on public.units;
create policy units_select_authenticated
  on public.units for select
  to authenticated
  using (true);

drop policy if exists units_write_admin on public.units;
create policy units_write_admin
  on public.units for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.units (name)
select name from (values ('Downtown'), ('Barra Shopping')) as seed(name)
where not exists (select 1 from public.units);

-- 2. Macas passam a pertencer a uma unidade --------------------------------

alter table public.macas add column if not exists unit_id uuid references public.units (id);

update public.macas
set unit_id = (select id from public.units where name = 'Downtown')
where unit_id is null;

alter table public.macas alter column unit_id set not null;

alter table public.macas drop constraint if exists macas_unit_id_label_key;
alter table public.macas add constraint macas_unit_id_label_key unique (unit_id, label);

-- Barra Shopping tem só Maca 1 e Maca 2
insert into public.macas (label, unit_id)
select seed.label, (select id from public.units where name = 'Barra Shopping')
from (values ('Maca 1'), ('Maca 2')) as seed(label)
where not exists (
  select 1 from public.macas m
  join public.units u on u.id = m.unit_id
  where u.name = 'Barra Shopping'
);

-- 3. Agendamentos passam a pertencer a uma unidade --------------------------

alter table public.appointments add column if not exists unit_id uuid references public.units (id);
alter table public.appointments alter column unit_id set not null;

create index if not exists appointments_collaborator_starts_idx
  on public.appointments (collaborator_id, starts_at);
create index if not exists appointments_unit_starts_idx
  on public.appointments (unit_id, starts_at);

-- 4. Regra: a maca escolhida precisa ser da mesma unidade do agendamento ----
-- (substitui a função enforce_maca_by_role da fase 2, mesma trigger)

create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  collaborator_role public.user_role;
  maca_unit_id uuid;
begin
  select role into collaborator_role
  from public.profiles
  where id = new.collaborator_id;

  if collaborator_role = 'piercer' and new.maca_id is not null then
    raise exception 'Body piercer nao utiliza maca.';
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

drop trigger if exists enforce_maca_by_role_trigger on public.appointments;
drop trigger if exists enforce_appointment_rules_trigger on public.appointments;
create trigger enforce_appointment_rules_trigger
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_rules();

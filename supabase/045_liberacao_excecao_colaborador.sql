-- Permite que um admin conceda a um colaborador especifico uma liberacao
-- temporaria pra agendar/escolher maca (e, por tabela, abrir comanda) fora
-- do horario de funcionamento ou aos domingos, sem precisar ser admin.

create table if not exists public.collaborator_exception_passes (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.profiles (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint collaborator_exception_passes_ends_after_starts check (ends_at > starts_at)
);

alter table public.collaborator_exception_passes enable row level security;

drop policy if exists "collaborator_exception_passes_admin_all" on public.collaborator_exception_passes;
create policy "collaborator_exception_passes_admin_all"
  on public.collaborator_exception_passes
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "collaborator_exception_passes_self_select" on public.collaborator_exception_passes;
create policy "collaborator_exception_passes_self_select"
  on public.collaborator_exception_passes
  for select
  using (auth.uid() = collaborator_id);

create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  collaborator_role public.user_role;
  actor_role public.user_role;
  maca_unit_id uuid;
  pass_maca_id uuid;
  pass_unit_id uuid;
  pass_starts timestamptz;
  pass_ends timestamptz;
  unit_opens time;
  unit_closes time;
  local_start_dow int;
  local_start_date date;
  local_end_date date;
  local_start_time time;
  local_end_time time;
  has_exception_pass boolean;
begin
  select role into collaborator_role
  from public.profiles
  where id = new.collaborator_id;

  if collaborator_role in ('piercer', 'chefe_piercing') and new.maca_id is not null then
    raise exception 'Body piercer nao utiliza maca.';
  end if;

  if collaborator_role in ('tatuador', 'admin') and new.maca_id is null then
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

  if new.maca_id is not null then
    select role into actor_role from public.profiles where id = auth.uid();

    if actor_role is distinct from 'admin' then
      select exists(
        select 1 from public.collaborator_exception_passes
        where collaborator_id = auth.uid()
          and now() between starts_at and ends_at
      ) into has_exception_pass;
    end if;

    if actor_role is distinct from 'admin' and not has_exception_pass then
      select opens_at, closes_at into unit_opens, unit_closes
      from public.units where id = new.unit_id;

      local_start_dow := extract(dow from (new.starts_at at time zone 'America/Sao_Paulo'));
      local_start_date := (new.starts_at at time zone 'America/Sao_Paulo')::date;
      local_end_date := (new.ends_at at time zone 'America/Sao_Paulo')::date;
      local_start_time := (new.starts_at at time zone 'America/Sao_Paulo')::time;
      local_end_time := (new.ends_at at time zone 'America/Sao_Paulo')::time;

      if local_start_dow = 0 then
        raise exception 'O estudio nao funciona aos domingos.';
      end if;

      if local_start_date is distinct from local_end_date then
        raise exception 'Agendamento de maca nao pode atravessar a meia-noite.';
      end if;

      if unit_opens is not null and unit_closes is not null
         and (local_start_time < unit_opens or local_end_time > unit_closes) then
        raise exception 'Horario fora do funcionamento da unidade.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

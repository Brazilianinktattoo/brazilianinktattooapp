-- A checagem "now() between pass_starts and pass_ends" na trigger
-- enforce_appointment_rules existia pra impedir o VISITANTE de usar um
-- passe fora da janela dele (self-service em tempo real). Mas isso também
-- bloqueava o admin de criar, com antecedência, o agendamento que reserva
-- a maca pro período todo do passe (a maioria dos passes é criado com
-- dias de antecedência) — só libera esse horário quando "agora" já bate
-- com o período, o que nunca acontece na hora de criar o passe. Agora só
-- exige "now() dentro da janela" quando quem está agindo NÃO é admin.

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
  local_start_date date;
  local_end_date date;
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
    select role into actor_role from public.profiles where id = auth.uid();

    select maca_id, unit_id, starts_at, ends_at
      into pass_maca_id, pass_unit_id, pass_starts, pass_ends
    from public.coworking_passes
    where profile_id = new.collaborator_id
    order by created_at desc
    limit 1;

    if pass_maca_id is null then
      raise exception 'Acesso de coworking expirado ou nao encontrado.';
    end if;

    if actor_role is distinct from 'admin' and (now() < pass_starts or now() > pass_ends) then
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

    local_start_date := (new.starts_at at time zone 'America/Sao_Paulo')::date;
    local_end_date := (new.ends_at at time zone 'America/Sao_Paulo')::date;
    if local_start_date is distinct from local_end_date then
      raise exception 'Agendamento de maca nao pode atravessar a meia-noite.';
    end if;
  end if;

  return new;
end;
$$;

-- O estúdio às vezes abre aos domingos e faz atendimentos fora do horário
-- normal — a restrição de domingo/horário de funcionamento (introduzida em
-- 041 e depois com liberação por exceção em 045) deixou de fazer sentido.
-- Remove a checagem por completo pra todo mundo (equipe e visitantes do
-- coworking). collaborator_exception_passes fica no banco sem uso — não é
-- referenciada mais por esta função, mas não há necessidade de apagar.

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

    local_start_date := (new.starts_at at time zone 'America/Sao_Paulo')::date;
    local_end_date := (new.ends_at at time zone 'America/Sao_Paulo')::date;
    if local_start_date is distinct from local_end_date then
      raise exception 'Agendamento de maca nao pode atravessar a meia-noite.';
    end if;
  end if;

  return new;
end;
$$;

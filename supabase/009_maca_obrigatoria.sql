-- Brazilian Ink Tattoo — maca obrigatória para tatuador
-- Rode depois do supabase/008_comandas.sql.

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

  if collaborator_role = 'tatuador' and new.maca_id is null then
    raise exception 'Tatuador precisa escolher uma maca.';
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

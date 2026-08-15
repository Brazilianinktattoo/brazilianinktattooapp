-- Brazilian Ink Tattoo — notificações in-app de agendamento
-- Rode depois do supabase/004_unidades.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_unread_idx
  on public.notifications (profile_id, read, created_at desc);

alter table public.notifications enable row level security;

-- cada colaborador só vê e marca como lida a própria notificação
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- inserts só acontecem via trigger (security definer); nenhuma policy de
-- insert é criada de propósito.

-- Gera a notificação automaticamente ao criar, alterar ou cancelar um
-- agendamento — dispara pra qualquer caminho que grave em appointments
-- (server actions ou edição manual no banco), não só a UI.
create or replace function public.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  when_label text;
  msg text;
begin
  when_label := to_char(
    new.starts_at at time zone 'America/Sao_Paulo',
    'DD/MM "às" HH24:MI'
  );

  if TG_OP = 'INSERT' then
    msg := 'Novo agendamento: ' || new.client_name || ' em ' || when_label;
    insert into public.notifications (profile_id, appointment_id, message)
    values (new.collaborator_id, new.id, msg);
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
      msg := 'Agendamento cancelado: ' || old.client_name || ' em ' || when_label;
      insert into public.notifications (profile_id, appointment_id, message)
      values (old.collaborator_id, old.id, msg);
    elsif old.starts_at is distinct from new.starts_at
       or old.ends_at is distinct from new.ends_at
       or old.maca_id is distinct from new.maca_id
       or old.unit_id is distinct from new.unit_id
       or old.client_name is distinct from new.client_name
       or old.collaborator_id is distinct from new.collaborator_id then
      msg := 'Agendamento alterado: ' || new.client_name || ' em ' || when_label;
      insert into public.notifications (profile_id, appointment_id, message)
      values (new.collaborator_id, new.id, msg);
      if old.collaborator_id is distinct from new.collaborator_id then
        insert into public.notifications (profile_id, appointment_id, message)
        values (old.collaborator_id, old.id, 'Agendamento removido da sua agenda: ' || old.client_name || ' em ' || when_label);
      end if;
    end if;
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists notify_appointment_change_trigger on public.appointments;
create trigger notify_appointment_change_trigger
  after insert or update on public.appointments
  for each row execute function public.notify_appointment_change();

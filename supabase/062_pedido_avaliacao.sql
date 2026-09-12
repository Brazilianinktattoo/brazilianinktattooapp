-- Pedido de avaliação no Google, 3 dias após qualquer comanda fechada
-- (tatuagem OU piercing — ao contrário do pós-tattoo, que é só tatuador).
-- Mesmo mecanismo de fila já usado pelo pós-tattoo/aniversário
-- (generate_due_messages() + message_queue + cron de dispatch existente).

alter table public.message_templates drop constraint if exists message_templates_trigger_check;
alter table public.message_templates add constraint message_templates_trigger_check
  check (trigger in (
    'aniversario', 'pos_tattoo_1', 'pos_tattoo_7', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60',
    'pedido_avaliacao'
  ));

insert into public.message_templates (trigger, body, active) values
  (
    'pedido_avaliacao',
    $body$Oi, {{nome}}! Aqui é a equipe do Brazilian Ink Tattoo 🖤

Esperamos que esteja curtindo o resultado do seu atendimento! Se puder, deixar uma avaliação no Google ajuda muito outras pessoas a conhecerem nosso trabalho — leva menos de um minuto.$body$,
    true
  )
on conflict (trigger) do nothing;

create or replace function public.generate_due_messages()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  tpl record;
  days_map jsonb := '{"pos_tattoo_1":1,"pos_tattoo_7":7,"pos_tattoo_15":15,"pos_tattoo_30":30,"pos_tattoo_60":60}';
  offset_days int;
begin
  -- aniversário
  select * into tpl from public.message_templates where trigger = 'aniversario' and active;
  if found then
    insert into public.message_queue (client_id, kind, body, scheduled_for)
    select c.id, 'aniversario',
      replace(tpl.body, '{{nome}}', split_part(c.full_name, ' ', 1)),
      today
    from public.clients c
    where c.birthday is not null
      and extract(month from c.birthday) = extract(month from today)
      and extract(day from c.birthday) = extract(day from today)
    on conflict do nothing;
  end if;

  -- pós-tattoo (1/7/15/30/60 dias após o fechamento da comanda, só tatuagem)
  for tpl in
    select * from public.message_templates
    where trigger in ('pos_tattoo_1', 'pos_tattoo_7', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60')
      and active
  loop
    offset_days := (days_map ->> tpl.trigger)::int;
    insert into public.message_queue (client_id, kind, comanda_id, body, scheduled_for)
    select a.client_id, tpl.trigger, cm.id,
      replace(tpl.body, '{{nome}}', split_part(a.client_name, ' ', 1)),
      today
    from public.comandas cm
    join public.appointments a on a.id = cm.appointment_id
    join public.profiles p on p.id = cm.collaborator_id
    where cm.status = 'fechada'
      and p.role = 'tatuador'
      and a.client_id is not null
      and (cm.closed_at at time zone 'America/Sao_Paulo')::date = today - offset_days
    on conflict do nothing;
  end loop;

  -- pedido de avaliação: 3 dias após QUALQUER comanda fechada (tatuagem ou
  -- piercing), independente de quem atendeu.
  select * into tpl from public.message_templates where trigger = 'pedido_avaliacao' and active;
  if found then
    insert into public.message_queue (client_id, kind, comanda_id, body, scheduled_for)
    select a.client_id, 'pedido_avaliacao', cm.id,
      replace(tpl.body, '{{nome}}', split_part(a.client_name, ' ', 1)),
      today
    from public.comandas cm
    join public.appointments a on a.id = cm.appointment_id
    where cm.status = 'fechada'
      and a.client_id is not null
      and (cm.closed_at at time zone 'America/Sao_Paulo')::date = today - 3
    on conflict do nothing;
  end if;
end;
$$;

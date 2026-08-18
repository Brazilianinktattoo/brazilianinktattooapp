-- Brazilian Ink Tattoo — automação de WhatsApp (WAME API).
-- Rode depois do supabase/015_mensagens.sql.
--
-- 1) Corrige os gatilhos de pós-tattoo pra 1/7/15/30/60 dias (antes era
--    5/15/30/60) e atualiza os textos padrão.
-- 2) Acrescenta rastreio de envio real na fila (status 'erro', tentativas,
--    id da mensagem no provedor) — até aqui a fila só sabia "pendente/
--    enviada/cancelada" marcado manualmente pelo admin.

-- --- 1) gatilhos de pós-tattoo: 5 -> 1 + 7 -------------------------------

alter table public.message_templates drop constraint if exists message_templates_trigger_check;

delete from public.message_templates where trigger = 'pos_tattoo_5';

alter table public.message_templates add constraint message_templates_trigger_check
  check (trigger in (
    'aniversario', 'pos_tattoo_1', 'pos_tattoo_7', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60'
  ));

insert into public.message_templates (trigger, body, active) values
  ('pos_tattoo_1', '', false),
  ('pos_tattoo_7', '', false)
on conflict (trigger) do nothing;

-- Texto padrão novo, igual pros 5 gatilhos de pós-tattoo (o admin pode
-- personalizar cada um depois pela tela de Mensagens).
update public.message_templates set body =
$body$Olá! Esperamos que esteja curtindo sua nova tattoo 💛 Essa mensagem é para saber como está o processo de cicatrização!

Lembrando dos cuidados: O filme protetor aplicado deve ficar na pele por até 4 dias — remova antes, com água morna, se acumular muito líquido embaixo dele. Após a saída total da película, aplique uma fina camada de hidratante da sua escolha, e para exposição ao sol, use protetor solar.

Qualquer dúvida, fale com seu tatuador(a) ou com a gente!

Esperamos te ver em breve. Até lá! 🖤$body$
where trigger in ('pos_tattoo_1', 'pos_tattoo_7', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60');

update public.message_templates set body =
$body$Feliz aniversário, {{nome}}! 🎉🖤

A equipe do Brazilian Ink Tattoo deseja a você um dia incrível, cheio de boas energias!

Como um mimo especial, você ganhou 20% de desconto em qualquer procedimento, válido até o fim do mês do seu aniversário 🎁 É só mencionar esse presente quando for agendar.

Esperamos te ver em breve. Um abraço da família BIT! 🖤$body$
where trigger = 'aniversario';

-- --- 2) fila: rastreio de envio real (WAME) ------------------------------

alter table public.message_queue drop constraint if exists message_queue_status_check;
alter table public.message_queue add constraint message_queue_status_check
  check (status in ('pendente', 'enviada', 'cancelada', 'erro'));

alter table public.message_queue add column if not exists send_attempts int not null default 0;
alter table public.message_queue add column if not exists last_error text;
alter table public.message_queue add column if not exists provider_message_id text;

-- --- 3) generate_due_messages(): dias 1/7/15/30/60 -----------------------

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
end;
$$;

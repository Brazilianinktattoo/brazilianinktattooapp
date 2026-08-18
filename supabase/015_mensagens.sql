-- Brazilian Ink Tattoo — Fase 7: mensagens automáticas (aniversário,
-- pós-tattoo) + fila de envio manual + promoções.
-- Rode depois do supabase/014_comissao_clientes.sql.
--
-- Não existe integração de WhatsApp ainda — a fila (message_queue) é o
-- ponto de encaixe pronto pra isso. Por enquanto o envio é manual: a
-- automação só gera o texto pronto + o telefone, o admin manda pelo próprio
-- WhatsApp e marca como enviada.

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  trigger text not null unique check (trigger in (
    'aniversario', 'pos_tattoo_5', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60'
  )),
  active boolean not null default false,
  body text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

insert into public.message_templates (trigger, body) values
  ('aniversario', 'Oi {{nome}}! A equipe da Brazilian Ink Tattoo deseja um feliz aniversário! 🎉'),
  ('pos_tattoo_5', 'Oi {{nome}}! Já faz 5 dias da sua tatuagem — como está a cicatrização? Qualquer dúvida, é só chamar a gente.'),
  ('pos_tattoo_15', 'Oi {{nome}}! Já faz 15 dias da sua tatuagem. Está tudo cicatrizando bem? Estamos à disposição.'),
  ('pos_tattoo_30', 'Oi {{nome}}! Faz 30 dias da sua tatuagem. Esperamos que esteja curtindo bastante o resultado!'),
  ('pos_tattoo_60', 'Oi {{nome}}! Já se passaram 60 dias da sua tatuagem. Obrigado por confiar na Brazilian Ink Tattoo!')
on conflict (trigger) do nothing;

alter table public.message_templates enable row level security;

drop policy if exists message_templates_admin on public.message_templates;
create policy message_templates_admin
  on public.message_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Fila de mensagens: geradas automaticamente (aniversário/pós-tattoo) pela
-- função abaixo, ou manualmente pelo admin (promoções).
create table if not exists public.message_queue (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null,
  comanda_id uuid references public.comandas (id) on delete set null,
  body text not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviada', 'cancelada')),
  scheduled_for date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists message_queue_status_idx on public.message_queue (status, scheduled_for);

-- evita duplicar o mesmo aviso automático pro mesmo cliente/gatilho/comanda —
-- não vale pra 'promocao' (admin pode mandar mais de uma campanha no mesmo dia)
create unique index if not exists message_queue_dedupe_idx
  on public.message_queue (
    client_id, kind,
    coalesce(comanda_id, '00000000-0000-0000-0000-000000000000'::uuid),
    scheduled_for
  )
  where kind <> 'promocao';

alter table public.message_queue enable row level security;

drop policy if exists message_queue_admin on public.message_queue;
create policy message_queue_admin
  on public.message_queue for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Gera as mensagens automáticas do dia (aniversário + pós-tattoo). Chamada
-- diariamente via pg_cron; também pode ser chamada manualmente (botão
-- "Gerar mensagens de hoje" na tela de Mensagens, ou direto no SQL Editor).
create or replace function public.generate_due_messages()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  tpl record;
  days_map jsonb := '{"pos_tattoo_5":5,"pos_tattoo_15":15,"pos_tattoo_30":30,"pos_tattoo_60":60}';
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

  -- pós-tattoo (5/15/30/60 dias após o fechamento da comanda, só tatuagem)
  for tpl in
    select * from public.message_templates
    where trigger in ('pos_tattoo_5', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60')
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

-- pg_cron: roda todo dia às 11:00 UTC (08:00 em São Paulo, UTC-3 fixo)
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'generate-due-messages-daily') then
    perform cron.schedule(
      'generate-due-messages-daily',
      '0 11 * * *',
      $cron$select public.generate_due_messages();$cron$
    );
  end if;
end $$;

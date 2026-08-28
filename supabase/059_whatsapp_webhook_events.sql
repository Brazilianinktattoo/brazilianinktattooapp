-- Guarda o payload cru que a Meta manda pro webhook (status de entrega —
-- sent/delivered/read/failed, com o motivo do erro quando falha — e
-- mensagens recebidas). Só pra diagnosticar por que as notificações de
-- admin não estavam chegando de verdade no WhatsApp, mesmo com a API
-- aceitando o envio.

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_webhook_events_created_at_idx
  on public.whatsapp_webhook_events (created_at desc);

alter table public.whatsapp_webhook_events enable row level security;

drop policy if exists whatsapp_webhook_events_select_admin on public.whatsapp_webhook_events;
create policy whatsapp_webhook_events_select_admin
  on public.whatsapp_webhook_events for select
  to authenticated
  using (public.is_admin());

-- Caixa de entrada do WhatsApp (Conversas): guarda toda mensagem recebida e
-- enviada pelo número oficial, agrupada por contato. Escrita só pelo
-- servidor (client admin, webhook/server actions); leitura só admin.

create table if not exists public.whatsapp_conversations (
  phone text primary key,                 -- wa_id da Meta (só dígitos, com DDI)
  display_name text,
  client_id uuid references public.clients (id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,            -- abre/fecha a janela de 24h
  last_preview text,
  unread_count int not null default 0,
  last_admin_alert_at timestamptz
);

create index if not exists whatsapp_conversations_last_idx
  on public.whatsapp_conversations (last_message_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text unique,
  phone text not null references public.whatsapp_conversations (phone) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  type text not null default 'text',
  body text,
  media_id text,
  media_path text,
  mime_type text,
  status text,                            -- out: sent/delivered/read/failed
  error text,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_phone_idx
  on public.whatsapp_messages (phone, created_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists whatsapp_conversations_admin on public.whatsapp_conversations;
create policy whatsapp_conversations_admin
  on public.whatsapp_conversations for select
  to authenticated
  using (public.is_admin());

drop policy if exists whatsapp_messages_admin on public.whatsapp_messages;
create policy whatsapp_messages_admin
  on public.whatsapp_messages for select
  to authenticated
  using (public.is_admin());

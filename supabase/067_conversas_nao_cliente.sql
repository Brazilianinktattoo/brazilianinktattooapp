-- Conversas marcadas como "não é cliente" (ex: contatos de outras empresas
-- que acham o número): somem da lista principal e não geram aviso.
alter table public.whatsapp_conversations
  add column if not exists ignored boolean not null default false,
  add column if not exists blocked boolean not null default false;

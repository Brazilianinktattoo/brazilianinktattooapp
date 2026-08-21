-- Integração app -> Google Agenda (mão única, uma agenda por unidade).
-- google_calendar_id fica null até o admin configurar a agenda da unidade;
-- com null, a sincronização é simplesmente pulada (ver lib/google-calendar.ts).

alter table public.units
  add column if not exists google_calendar_id text;

alter table public.appointments
  add column if not exists google_event_id text;

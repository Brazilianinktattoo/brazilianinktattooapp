-- Cria os agendamentos de bloqueio pros passes de coworking que já
-- existiam antes da correção (048) — sem isso, eles continuariam sem
-- aparecer na agenda principal. Desliga a trigger só pra esse insert
-- porque ela checa "quem está logado agora" (auth.uid()), e rodando aqui
-- pelo SQL Editor não tem ninguém logado como usuário do app.

alter table public.appointments disable trigger enforce_appointment_rules_trigger;

insert into public.appointments (collaborator_id, unit_id, maca_id, client_name, client_phone, starts_at, ends_at, notes)
select
  p.profile_id,
  p.unit_id,
  p.maca_id,
  p.guest_name,
  coalesce(p.guest_contact, ''),
  p.starts_at,
  p.ends_at,
  'Bloqueio automático — período reservado de coworking.'
from public.coworking_passes p
where not exists (
  select 1 from public.appointments a where a.collaborator_id = p.profile_id
);

alter table public.appointments enable trigger enforce_appointment_rules_trigger;

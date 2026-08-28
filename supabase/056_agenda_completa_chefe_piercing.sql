-- Chefe de Piercing pediu pra ver a agenda inteira do estúdio (dia/mês/ano),
-- incluindo os agendamentos de tatuador — antes só enxergava os de piercing
-- (via appointments_select_chefe_piercing). Isso é só leitura: editar
-- continua restrito a "dono do agendamento ou admin" na aplicação, então
-- esse acesso mais amplo não dá permissão de mexer nos agendamentos de
-- tatuador, só de ver.

drop policy if exists appointments_select_others on public.appointments;
create policy appointments_select_others
  on public.appointments for select
  to authenticated
  using (not public.is_visitante());

-- Redundante agora que appointments_select_others já cobre tudo que essa
-- cobria (e mais) — políticas permissivas se combinam com OR, então
-- manter as duas não restringiria nada, só confundiria depois.
drop policy if exists appointments_select_chefe_piercing on public.appointments;

-- Brazilian Ink Tattoo — Admin, Tatuador e Chefe de Piercing passam a
-- poder cadastrar cliente direto do próprio painel (sem passar pela
-- recepção). Registra quem cadastrou, pra rastreabilidade.
-- Rode depois do supabase/032_admin_chefe_atendimento.sql.

alter table public.clients
  add column if not exists created_by uuid references public.profiles (id);

-- clients_staff_all excluía Chefe de Piercing (só quem cria agendamento
-- mexia em cliente) — agora ele também cadastra os próprios clientes.
drop policy if exists clients_staff_all on public.clients;
create policy clients_staff_all
  on public.clients for all
  to authenticated
  using (not public.is_visitante())
  with check (not public.is_visitante());

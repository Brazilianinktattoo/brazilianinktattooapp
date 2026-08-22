-- Permite vincular uma ficha avulsa (inglês/espanhol) a um agendamento
-- específico, pra aparecer junto da ficha em português na tela
-- /agendamentos/[id]/anamnese — continua nullable pra fichas geradas sem
-- agendamento (aba Fichas, cliente estrangeiro avulso).
alter table public.coworking_anamnese_forms
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null;

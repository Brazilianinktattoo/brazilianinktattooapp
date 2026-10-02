-- "Cliente próprio" editável direto na comanda, independente da ficha de
-- anamnese: null = automático (ficha/agendamento), true/false = decisão
-- manual do tatuador/admin, que vale por cima de tudo na hora de calcular
-- a comissão.
alter table public.comandas
  add column if not exists client_is_own_override boolean;

-- Número de WhatsApp do colaborador pra receber avisos (agendamento
-- criado, comanda aberta) via WAME API. Opcional — sem número, o
-- colaborador continua recebendo só o aviso no sininho do app.
alter table public.profiles
  add column if not exists whatsapp_phone text;

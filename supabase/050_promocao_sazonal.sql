-- Guarda os parâmetros do modelo "promocao_sazonal" (título + oferta de
-- tatuagem + oferta de piercing) pra cada mensagem da fila que precisa
-- deles — sem isso, o envio de promoção continuava em texto livre e só
-- entregava dentro da janela de 24h.
alter table public.message_queue
  add column if not exists template_params text[];

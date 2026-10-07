-- Ficha de anamnese: separa "quem trouxe" (comissão) de "como conheceu"
-- (marketing/Raio-X). A opção 'barra_shopping' sai de client_origin — a
-- comissão do Barra Shopping já vem da unidade da comanda.

alter table public.anamnese_forms drop constraint if exists anamnese_forms_client_origin_check;

update public.anamnese_forms
set client_origin = 'indicado_pelo_estudio'
where client_origin = 'barra_shopping';

alter table public.anamnese_forms
  add constraint anamnese_forms_client_origin_check
  check (client_origin in ('trazido_pelo_tatuador', 'indicado_pelo_estudio'));

alter table public.anamnese_forms add column if not exists how_met text
  check (how_met in (
    'instagram_estudio', 'google', 'indicacao_cliente', 'passou_na_porta',
    'anuncio', 'escola_bit', 'instagram_artista', 'outro'
  ));

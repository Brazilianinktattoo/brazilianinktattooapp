-- Brazilian Ink Tattoo — separa jóia de serviço no piercing: joia avulsa e
-- as combinações "perfuração + joia" viram itens de Jóia (catálogo já
-- existente, com aplicação/troca/venda), não mais "serviço" — assim dá pra
-- vender só a jóia, a jóia junto com a perfuração, ou só a perfuração,
-- cada valor editável independentemente. "Só perfuração" continua como
-- serviço puro. Rode depois do supabase/033_cliente_cadastrado_por.sql.

insert into public.jewelry_catalog (name, material, category, price_aplicacao, price_troca, price_venda) values
  ('Básica', 'Titânio', 'Titânio', 80.00, 80.00, 80.00),
  ('Segmento liso', 'Titânio', 'Titânio', 135.00, 135.00, 135.00),
  ('Argola com pedras', 'Titânio', 'Titânio', 220.00, 220.00, 220.00),
  ('Decoradas', 'Titânio', 'Titânio', 170.00, 170.00, 170.00),
  ('Ponto de luz', 'Titânio', 'Titânio', 120.00, 120.00, 120.00),
  ('Cluster', 'Titânio', 'Titânio', 200.00, 200.00, 200.00),
  ('Umbigo básica', 'Titânio', 'Titânio', 170.00, 170.00, 170.00),
  ('Umbigo decorada', 'Titânio', 'Titânio', 230.00, 230.00, 230.00),
  ('Nostril', 'Titânio', 'Titânio', 80.00, 80.00, 80.00),
  ('D-ring com pedras', 'Titânio', 'Titânio', 180.00, 180.00, 180.00),
  ('D-ring liso click', 'Titânio', 'Titânio', 130.00, 130.00, 130.00),
  ('Básica', 'Aço Cirúrgico', 'Aço Cirúrgico', 50.00, 50.00, 50.00),
  ('Labret decorado', 'Aço Cirúrgico', 'Aço Cirúrgico', 60.00, 60.00, 60.00),
  ('Ponto de luz', 'Aço Cirúrgico', 'Aço Cirúrgico', 70.00, 70.00, 70.00),
  ('Argola com brilho', 'Aço Cirúrgico', 'Aço Cirúrgico', 90.00, 90.00, 90.00),
  ('Cluster', 'Aço Cirúrgico', 'Aço Cirúrgico', 120.00, 120.00, 120.00);

-- Desativa (não apaga — preserva histórico de comandas já lançadas) os
-- itens de "joia avulsa" e as combinações "perfuração + joia" do catálogo
-- de Serviços — agora vivem em Jóias.
update public.services
set active = false
where category = 'piercing'
  and subcategory in ('joia_titanio', 'joia_aco', 'perfuracao_joia');

-- products_select_authenticated (007_estoque.sql) era um "using(true)"
-- solto que anulava a restrição de categoria pro Chefe de Piercing
-- (products_select_chefe_piercing, em 010b_chefe_piercing.sql) — ele via
-- (embora não editasse) produtos gerais como pomadas, que são só do admin.
drop policy if exists products_select_authenticated on public.products;

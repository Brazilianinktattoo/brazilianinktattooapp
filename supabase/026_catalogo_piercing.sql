-- Brazilian Ink Tattoo — catálogo de serviços de piercing, organizado em
-- subcategorias (editáveis pelo Chefe de Piercing, igual ao resto do
-- catálogo). Rode depois do supabase/025_anamnese_valores.sql.

alter table public.services
  add column if not exists subcategory text not null default '';

-- "Básica"/"Ponto de luz"/"Cluster" se repetem entre titânio e aço, então a
-- unicidade real é (nome, categoria, subcategoria).
create unique index if not exists services_name_category_subcategory_key
  on public.services (name, category, subcategory);

insert into public.services (name, category, subcategory, price) values
  -- Só perfuração
  ('Par de lóbulo', 'piercing', 'so_perfuracao', 120.00),
  ('1 lóbulo só', 'piercing', 'so_perfuracao', 70.00),
  ('Demais na orelha', 'piercing', 'so_perfuracao', 140.00),
  ('Nariz', 'piercing', 'so_perfuracao', 140.00),
  ('Umbigo', 'piercing', 'so_perfuracao', 150.00),
  ('Boca/língua', 'piercing', 'so_perfuracao', 160.00),
  ('Transversal', 'piercing', 'so_perfuracao', 170.00),
  ('Mamilo', 'piercing', 'so_perfuracao', 150.00),
  ('Perfuração íntima feminina', 'piercing', 'so_perfuracao', 450.00),
  ('Perfuração íntima masculina', 'piercing', 'so_perfuracao', 700.00),

  -- Perfuração + joia
  ('1 lóbulo + joia titânio básica', 'piercing', 'perfuracao_joia', 150.00),
  ('Par de lóbulo + joia titânio básica', 'piercing', 'perfuracao_joia', 280.00),
  ('1 lóbulo + joia titânio ponto de luz', 'piercing', 'perfuracao_joia', 150.00),
  ('Par de lóbulo + 2 joias titânio ponto de luz', 'piercing', 'perfuracao_joia', 260.00),

  -- Joias avulsas — Titânio
  ('Básica', 'piercing', 'joia_titanio', 80.00),
  ('Segmento liso', 'piercing', 'joia_titanio', 135.00),
  ('Argola com pedras', 'piercing', 'joia_titanio', 220.00),
  ('Decoradas', 'piercing', 'joia_titanio', 170.00),
  ('Ponto de luz', 'piercing', 'joia_titanio', 120.00),
  ('Cluster', 'piercing', 'joia_titanio', 200.00),
  ('Umbigo básica', 'piercing', 'joia_titanio', 170.00),
  ('Umbigo decorada', 'piercing', 'joia_titanio', 230.00),
  ('Nostril', 'piercing', 'joia_titanio', 80.00),
  ('D-ring com pedras', 'piercing', 'joia_titanio', 180.00),
  ('D-ring liso click', 'piercing', 'joia_titanio', 130.00),

  -- Joias avulsas — Aço Cirúrgico
  ('Básica', 'piercing', 'joia_aco', 50.00),
  ('Labret decorado', 'piercing', 'joia_aco', 60.00),
  ('Ponto de luz', 'piercing', 'joia_aco', 70.00),
  ('Argola com brilho', 'piercing', 'joia_aco', 90.00),
  ('Cluster', 'piercing', 'joia_aco', 120.00)
on conflict (name, category, subcategory) do nothing;

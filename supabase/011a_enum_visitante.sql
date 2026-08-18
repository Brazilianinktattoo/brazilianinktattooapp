-- Brazilian Ink Tattoo — acesso de coworking (tatuador visitante)
--
-- IMPORTANTE: rode este arquivo SOZINHO (Run separado), antes de
-- 011b_coworking.sql. Postgres não deixa usar um valor de enum recém
-- adicionado na mesma transação em que foi criado.

alter type public.user_role add value if not exists 'visitante';

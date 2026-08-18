-- Brazilian Ink Tattoo — novo papel Chefe de Piercing
--
-- IMPORTANTE: rode este arquivo SOZINHO (Run separado), antes de
-- 010b_chefe_piercing.sql. Postgres não deixa usar um valor de enum recém
-- adicionado na mesma transação em que foi criado.

alter type public.user_role add value if not exists 'chefe_piercing';

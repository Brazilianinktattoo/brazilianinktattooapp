-- Admin e Chefe de Piercing precisam corrigir/lançar itens (serviço,
-- produto, jóia) em comandas já fechadas de vez em quando — pra acertar
-- relatórios que já saíram errados. Antes disso era travado pra todo
-- mundo, sem exceção: só a exclusão da linha/comanda inteira já tinha
-- sido liberada (054). Agora insert/update em comanda fechada passa se
-- quem está agindo é admin ou chefe_piercing — RLS (comanda_services/
-- comanda_products/comanda_jewelry write policies) já restringe QUAIS
-- comandas cada um pode tocar, então não precisa repetir isso aqui.

create or replace function public.check_comanda_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_comanda_id uuid;
  comanda_status text;
  actor_role public.user_role;
begin
  if TG_OP = 'DELETE' then
    return old;
  end if;

  target_comanda_id := new.comanda_id;
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    select role into actor_role from public.profiles where id = auth.uid();
    if actor_role is distinct from 'admin' and actor_role is distinct from 'chefe_piercing' then
      raise exception 'Comanda fechada, nao e possivel editar.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_comanda_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_comanda_id uuid;
  comanda_status text;
  actor_role public.user_role;
  current_qty numeric;
begin
  if TG_OP = 'DELETE' then
    update public.products set quantity = quantity + old.quantity where id = old.product_id;
    return old;
  end if;

  target_comanda_id := new.comanda_id;
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    select role into actor_role from public.profiles where id = auth.uid();
    if actor_role is distinct from 'admin' and actor_role is distinct from 'chefe_piercing' then
      raise exception 'Comanda fechada, nao e possivel editar.';
    end if;
  end if;

  if TG_OP = 'INSERT' then
    select quantity into current_qty from public.products where id = new.product_id;
    if current_qty - new.quantity < 0 then
      raise exception 'Estoque insuficiente para este produto.';
    end if;
    update public.products set quantity = quantity - new.quantity where id = new.product_id;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if old.product_id is distinct from new.product_id then
      update public.products set quantity = quantity + old.quantity where id = old.product_id;
      select quantity into current_qty from public.products where id = new.product_id;
      if current_qty - new.quantity < 0 then
        raise exception 'Estoque insuficiente para este produto.';
      end if;
      update public.products set quantity = quantity - new.quantity where id = new.product_id;
    else
      select quantity into current_qty from public.products where id = new.product_id;
      if current_qty + old.quantity - new.quantity < 0 then
        raise exception 'Estoque insuficiente para este produto.';
      end if;
      update public.products
      set quantity = quantity + old.quantity - new.quantity
      where id = new.product_id;
    end if;
    return new;
  end if;

  return null;
end;
$$;

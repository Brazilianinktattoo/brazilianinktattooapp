-- check_comanda_open() e handle_comanda_product_change() bloqueavam a
-- exclusão de linhas de comanda_services/comanda_products/comanda_jewelry
-- sempre que a comanda não estava "aberta" — inclusive quando a exclusão é
-- consequência de apagar a COMANDA inteira (on delete cascade), que é
-- exatamente quando a trava não devia se aplicar. Isso impedia excluir
-- qualquer comanda fechada que já tivesse serviço/produto/jóia lançado.

create or replace function public.check_comanda_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_comanda_id uuid;
  comanda_status text;
begin
  if TG_OP = 'DELETE' then
    return old;
  end if;

  target_comanda_id := new.comanda_id;
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    raise exception 'Comanda fechada, nao e possivel editar.';
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
  current_qty numeric;
begin
  if TG_OP = 'DELETE' then
    update public.products set quantity = quantity + old.quantity where id = old.product_id;
    return old;
  end if;

  target_comanda_id := new.comanda_id;
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    raise exception 'Comanda fechada, nao e possivel editar.';
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

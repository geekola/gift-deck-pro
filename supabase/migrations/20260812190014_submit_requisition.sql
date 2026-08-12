-- 0014: submit_requisition RPC
--
-- ReviewAndSubmit.jsx's "Submit" button needs to, per brand group,
-- atomically: check the customer's gifting allowance with that brand
-- against the request subtotal, and either (a) create a requisition +
-- requisition_items and consume the allowance, or (b) create nothing and
-- leave the items in the customer's saved gallery. One brand
-- passing/failing has no effect on another (per the mock's own copy).
--
-- This can't be done as a sequence of plain client-side inserts/updates:
-- customers have no RLS write access to gifting_allowances.consumed at
-- all (allowances_customer_select is SELECT-only, deliberately - a
-- customer shouldn't be able to self-report their own spend), and even
-- if they did, doing this as separate statements would risk a partial
-- submission (requisition created but allowance not consumed, or vice
-- versa) if any one step failed. A SECURITY DEFINER function gives both
-- the elevated privilege and the atomicity - if anything inside raises,
-- Postgres rolls back the whole function's effects automatically.

create sequence if not exists requisition_invoice_seq;

create or replace function submit_requisition(
  p_brand_id uuid,
  p_items jsonb, -- [{ "product_id": uuid, "product_variant_id": uuid }, ...]
  p_shipping_address_id uuid,
  p_care_of_contact_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_allowance gifting_allowances%rowtype;
  v_subtotal numeric(10, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_requisition_id uuid;
  v_invoice_id text;
begin
  if auth_role() <> 'customer' then
    raise exception 'Only customers can submit requisitions.';
  end if;

  -- SECURITY DEFINER bypasses RLS entirely, including products_customer_
  -- select (migration 0008) - replicate its access checks explicitly here
  -- so this function can't be used as a backdoor to submit against a
  -- brand the customer was never actually granted (or was restricted
  -- from) access to.
  if not exists (
    select 1 from brands b
    join customer_brand_access a on a.brand_id = b.id and a.customer_id = v_customer_id
    where b.id = p_brand_id and b.status = 'approved' and a.status = 'approved'
  ) or customer_has_active_restriction(v_customer_id, p_brand_id) then
    raise exception 'You do not have access to this brand''s catalogue.';
  end if;

  if not exists (
    select 1 from shipping_addresses
    where id = p_shipping_address_id and customer_id = v_customer_id
  ) then
    raise exception 'Shipping address does not belong to this customer.';
  end if;

  if p_care_of_contact_id is not null and not exists (
    select 1 from customer_contacts
    where id = p_care_of_contact_id and customer_id = v_customer_id
  ) then
    raise exception 'Care-of contact does not belong to this customer.';
  end if;

  -- Re-derive the subtotal from products.cost_price server-side rather
  -- than trusting client-supplied prices - matches ReviewAndSubmit.jsx's
  -- brandSubtotal(), which sums cost_price (not price) across every item
  -- in the group regardless of item_type.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    if not found or v_product.brand_id <> p_brand_id then
      raise exception 'Item % does not belong to brand %', v_item->>'product_id', p_brand_id;
    end if;
    v_subtotal := v_subtotal + v_product.cost_price;
  end loop;

  select * into v_allowance
  from gifting_allowances
  where customer_id = v_customer_id and brand_id = p_brand_id;

  -- No allowance row means nothing has ever been configured for this pair
  -- (per CustomerAccessManager: "can't draw gifted merchandise until a
  -- limit is configured") - treat identically to an over-limit request.
  if not found or v_allowance.consumed + v_subtotal > v_allowance.limit_amount then
    return jsonb_build_object(
      'passed', false,
      'subtotal', v_subtotal,
      'allowance_limit', v_allowance.limit_amount,
      'allowance_consumed', v_allowance.consumed,
      'allowance_currency', v_allowance.currency,
      'reset_date', v_allowance.reset_date
    );
  end if;

  v_invoice_id := 'PSF-' || extract(year from now())::text || '-'
    || lpad(nextval('requisition_invoice_seq')::text, 5, '0');

  insert into requisitions (
    customer_id, brand_id, invoice_id, shipping_address_id, care_of_contact_id,
    subtotal, currency
  ) values (
    v_customer_id, p_brand_id, v_invoice_id, p_shipping_address_id, p_care_of_contact_id,
    v_subtotal, coalesce(v_allowance.currency, 'USD')
  )
  returning id into v_requisition_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;

    insert into requisition_items (
      requisition_id, product_id, product_variant_id, size_snapshot,
      item_type_snapshot, cost_price_snapshot, price_snapshot, currency_snapshot, is_gift
    )
    select
      v_requisition_id,
      v_product.id,
      pv.id,
      pv.size,
      v_product.item_type,
      v_product.cost_price,
      v_product.price,
      v_product.currency,
      v_product.item_type = 'gift'
    from product_variants pv
    where pv.id = (v_item->>'product_variant_id')::uuid and pv.product_id = v_product.id;

    if not found then
      raise exception 'Variant % does not belong to product %', v_item->>'product_variant_id', v_product.id;
    end if;
  end loop;

  update gifting_allowances
  set consumed = consumed + v_subtotal
  where customer_id = v_customer_id and brand_id = p_brand_id;

  delete from saved_items
  where customer_id = v_customer_id
    and product_id in (select (elem->>'product_id')::uuid from jsonb_array_elements(p_items) elem);

  return jsonb_build_object(
    'passed', true,
    'invoice_id', v_invoice_id,
    'subtotal', v_subtotal,
    'allowance_limit', v_allowance.limit_amount,
    'allowance_consumed', v_allowance.consumed + v_subtotal,
    'allowance_currency', v_allowance.currency
  );
end;
$$;

grant execute on function submit_requisition(uuid, jsonb, uuid, uuid) to authenticated;

-- 0020: enforce return address before a brand can begin fulfillment
--
-- MVP step 5. Migration 0011 dropped the DB constraint requiring a
-- return address before approval (it deadlocked against Settings being
-- approval-gated). BrandCompanySettings gave brands a real way to set
-- it post-approval, but nothing stopped an approved brand from
-- operating indefinitely with it blank. Per the earlier decision
-- ("enforce at the point it actually matters, not at approval time"):
-- that point is the moment a requisition moves to 'invoiced' - exactly
-- when advance_requisition_state generates the packing_slip and
-- order_form_invoice documents, both of which need the address.
-- Enforcing here rather than at product-listing time, since a brand
-- should be able to build out a catalogue before finishing onboarding
-- paperwork - the block only bites at the point a real order needs it.
create or replace function advance_requisition_state(
  p_requisition_id uuid,
  p_tracking_number text default null
)
returns requisitions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req requisitions%rowtype;
  v_next requisition_state;
  v_brand brands%rowtype;
begin
  if auth_role() <> 'brand_user' then
    raise exception 'Only brand users can advance requisition state.';
  end if;

  select * into v_req from requisitions where id = p_requisition_id;

  if not found or v_req.brand_id <> auth_brand_id() then
    raise exception 'Requisition not found for this brand.';
  end if;

  v_next := case v_req.state
    when 'submitted' then 'invoiced'
    when 'invoiced' then 'confirmed'
    when 'confirmed' then 'dispatched'
    else null
  end;

  if v_next is null then
    raise exception 'Requisition in state % cannot be advanced.', v_req.state;
  end if;

  if v_next = 'invoiced' then
    select * into v_brand from brands where id = v_req.brand_id;
    if v_brand.return_line1 is null or v_brand.return_city is null
       or v_brand.return_state is null or v_brand.return_zip is null
       or v_brand.return_country is null then
      raise exception 'Set a return address in Company Settings before invoicing an order.';
    end if;
  end if;

  if v_next = 'dispatched' and (p_tracking_number is null or btrim(p_tracking_number) = '') then
    raise exception 'A tracking number is required to mark a requisition dispatched.';
  end if;

  update requisitions set
    state = v_next,
    invoiced_at = case when v_next = 'invoiced' then now() else invoiced_at end,
    confirmed_at = case when v_next = 'confirmed' then now() else confirmed_at end,
    dispatched_at = case when v_next = 'dispatched' then now() else dispatched_at end,
    tracking_number = case when v_next = 'dispatched' then btrim(p_tracking_number) else tracking_number end
  where id = p_requisition_id
  returning * into v_req;

  if v_next = 'invoiced' then
    insert into order_documents (requisition_id, doc_type, email_sent)
    values
      (p_requisition_id, 'packing_slip', true),
      (p_requisition_id, 'order_form_invoice', true)
    on conflict (requisition_id, doc_type) do nothing;
  elsif v_next = 'dispatched' then
    insert into order_documents (requisition_id, doc_type, email_sent)
    values (p_requisition_id, 'return_info', true)
    on conflict (requisition_id, doc_type) do nothing;
  end if;

  return v_req;
end;
$$;

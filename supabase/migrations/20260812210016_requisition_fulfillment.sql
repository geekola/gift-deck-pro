-- 0016: brand-side fulfillment RPCs
--
-- Gap surfaced wiring BrandDocumentNotifications.jsx: the mock is a
-- read-only notification/download feed, but nothing anywhere lets a real
-- requisition move past 'submitted' or generates the order_documents rows
-- the feed reads. requisitions_brand_all (migration 0008) already grants
-- brand_user full CRUD on their own requisitions/order_documents, but state
-- transitions need validation (correct order, tracking number required for
-- dispatch) and side effects (document generation, allowance refund on
-- decline) that a bare client-side update can't safely do -- hence RPCs,
-- following the same SECURITY DEFINER pattern as submit_requisition.

-- Advances a requisition to the next state in the sequence:
--   submitted -> invoiced -> confirmed -> dispatched
-- One step at a time (no skipping). Dispatch requires a tracking number.
-- Invoicing auto-generates packing_slip + order_form_invoice document
-- rows (unread); dispatching adds a return_info row. Confirming adds no
-- new documents -- matches BrandDocumentNotifications.jsx's mock data,
-- where a confirmed notification shows the same document set as invoiced.
create or replace function advance_requisition_state(
  p_requisition_id uuid,
  p_tracking_number text default null
)
returns requisitions
language plpgsql
security definer
set search_path = public
as $
declare
  v_req requisitions%rowtype;
  v_next requisition_state;
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
$;

grant execute on function advance_requisition_state(uuid, text) to authenticated;

-- Declines a requisition and refunds the consumed gifting allowance, since
-- the customer never received anything (see AskUserQuestion decision:
-- "Yes, refund on decline"). Only allowed before the order has shipped --
-- once confirmed/dispatched, fulfillment is a customer-service problem,
-- not a state-machine one.
create or replace function decline_requisition(
  p_requisition_id uuid,
  p_reason text
)
returns requisitions
language plpgsql
security definer
set search_path = public
as $
declare
  v_req requisitions%rowtype;
begin
  if auth_role() <> 'brand_user' then
    raise exception 'Only brand users can decline requisitions.';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A decline reason is required.';
  end if;

  select * into v_req from requisitions where id = p_requisition_id;

  if not found or v_req.brand_id <> auth_brand_id() then
    raise exception 'Requisition not found for this brand.';
  end if;

  if v_req.state not in ('submitted', 'invoiced') then
    raise exception 'Requisition in state % can no longer be declined.', v_req.state;
  end if;

  update requisitions set
    state = 'declined',
    declined_at = now(),
    decline_reason = btrim(p_reason)
  where id = p_requisition_id
  returning * into v_req;

  update gifting_allowances set
    consumed = greatest(consumed - v_req.subtotal, 0)
  where customer_id = v_req.customer_id and brand_id = v_req.brand_id;

  return v_req;
end;
$;

grant execute on function decline_requisition(uuid, text) to authenticated;

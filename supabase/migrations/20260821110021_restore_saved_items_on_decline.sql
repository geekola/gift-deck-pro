-- 0021: restore saved_items on decline
--
-- OrderStatus.jsx tells the customer a declined item is "returned to your
-- saved gallery," but decline_requisition (migration 0016) never actually
-- did that - the saved_items row was deleted at submission time by
-- submit_requisition and nothing restored it. Flagged in Tasks.md as
-- deliberately not fixed blind (auto-restoring is itself a product call),
-- resolved via AskUserQuestion: restore behavior, matching the existing
-- copy exactly.
--
-- requisition_items.product_id (migration 0007) survives submission, so
-- this is a straight re-insert per declined product. DISTINCT in the
-- select guards against a requisition with two variants of the same
-- product (same product_id, different product_variant_id) - a single
-- INSERT...SELECT can't ON CONFLICT DO NOTHING its way past a duplicate
-- pair within its own result set. ON CONFLICT (customer_id, product_id) DO
-- NOTHING itself guards against the customer having already re-saved the
-- product some other way before the decline happened.

create or replace function decline_requisition(
  p_requisition_id uuid,
  p_reason text
)
returns requisitions
language plpgsql
security definer
set search_path = public
as $$
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

  insert into saved_items (customer_id, product_id)
  select distinct v_req.customer_id, ri.product_id
  from requisition_items ri
  where ri.requisition_id = p_requisition_id
  on conflict (customer_id, product_id) do nothing;

  return v_req;
end;
$$;

grant execute on function decline_requisition(uuid, text) to authenticated;

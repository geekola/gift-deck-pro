-- 0015: tracking number on requisitions
--
-- Gap surfaced while wiring OrderStatus.jsx. The mock has always shown a
-- tracking number once a requisition reaches 'dispatched'
-- (SEED_REQUISITIONS req_003), but requisitions (migration 0007) never
-- got a column for it - another straightforward miss from the original
-- reverse-engineering pass, not a design choice.

alter table requisitions add column tracking_number text;

-- 0005: products + variants
--
-- Fields and validation rules sourced from ProductForm.jsx (validate()),
-- SwipeDeck.jsx (SEED_CARDS shape), ProductCatalogue.jsx (erp_synced,
-- deriveActive()).

create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,

  name text not null,
  description text not null,
  category product_category not null,
  item_type item_type not null,

  -- Required regardless of item_type per ProductForm validate().
  cost_price numeric(10, 2) not null,
  -- Required only when item_type = 'purchase'.
  price numeric(10, 2),
  currency currency_code not null default 'USD',

  is_made_to_order boolean not null default false,
  -- Required when is_made_to_order.
  delivery_window text,
  -- Required when item_type = 'purchase'.
  return_policy text,

  -- Up to 3 images, one flagged as hero. Storing URLs/storage paths here;
  -- actual files live in Supabase Storage.
  images text[] not null default '{}',
  hero_image_index smallint not null default 0,

  erp_synced boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_price_required_for_purchase check (
    item_type <> 'purchase' or price is not null
  ),
  constraint products_return_policy_required_for_purchase check (
    item_type <> 'purchase' or return_policy is not null
  ),
  constraint products_delivery_window_required_for_mto check (
    not is_made_to_order or delivery_window is not null
  ),
  constraint products_max_3_images check (
    array_length(images, 1) is null or array_length(images, 1) <= 3
  ),
  constraint products_hero_index_in_range check (
    hero_image_index >= 0
    and (images = '{}' or hero_image_index < array_length(images, 1))
  )
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create index products_brand_id_idx on products(brand_id);
create index products_category_idx on products(category);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,

  size text not null,
  -- Required UNLESS the product is made-to-order or ERP-synced (ERP owns
  -- stock in that case). Enforced via trigger below since it needs to read
  -- the parent product row, which a plain check constraint can't do.
  stock_quantity integer,
  low_stock_threshold integer,

  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on product_variants(product_id);

create or replace function validate_variant_stock_quantity()
returns trigger
language plpgsql
as $$
declare
  p_is_mto boolean;
  p_erp_synced boolean;
begin
  select is_made_to_order, erp_synced into p_is_mto, p_erp_synced
  from products where id = new.product_id;

  if new.stock_quantity is null and not p_is_mto and not p_erp_synced then
    raise exception
      'stock_quantity is required for variant % (product % is neither made-to-order nor ERP-synced)',
      new.id, new.product_id;
  end if;

  return new;
end;
$$;

create trigger product_variants_validate_stock
  before insert or update on product_variants
  for each row execute function validate_variant_stock_quantity();

-- Product.active is a derived value (per ProductCatalogue.jsx
-- deriveActive()), not a stored column: true if at least one variant has
-- stock > 0. Exposed as a view rather than duplicated/denormalized state.
create view products_with_status as
select
  p.*,
  coalesce(bool_or(v.stock_quantity > 0), false) as is_active
from products p
left join product_variants v on v.product_id = p.id
group by p.id;

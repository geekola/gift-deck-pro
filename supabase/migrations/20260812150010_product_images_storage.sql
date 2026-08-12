-- 0010: product image storage bucket + RLS
--
-- ProductForm.jsx previously faked image upload ("mock_image_N" strings)
-- since there was nowhere real to put files. Real product images need
-- somewhere to live before ProductForm can write real rows into
-- products.images (text[] of URLs, per migration 0005).
--
-- Bucket is public-read (product photos are meant to be shown to
-- customers browsing the swipe deck - no reason to gate reads behind
-- auth/RLS and it keeps getPublicUrl() usable directly in <img> tags).
-- Writes are restricted to brand_user, and only into a folder prefixed
-- with their own brand_id, so one brand can never overwrite another
-- brand's images even though the bucket itself is shared.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

-- storage.foldername(name) splits the object path on "/" - objects are
-- uploaded as "<brand_id>/<filename>", so element 1 is the brand_id.
create policy product_images_brand_write on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth_role() = 'brand_user'
    and auth_brand_is_approved()
    and (storage.foldername(name))[1] = auth_brand_id()::text
  );

create policy product_images_brand_delete on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and auth_role() = 'brand_user'
    and (storage.foldername(name))[1] = auth_brand_id()::text
  );

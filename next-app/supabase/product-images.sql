insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "Public product images are viewable"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "Authenticated admins can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "Authenticated admins can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');

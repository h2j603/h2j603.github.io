-- ========================================
-- 003_storage_buckets.sql
-- ========================================

insert into storage.buckets (id, name, public)
values ('work-images', 'work-images', true)
on conflict (id) do nothing;

create policy "Public can view work images"
  on storage.objects for select
  using (bucket_id = 'work-images');

create policy "Authenticated can upload work images"
  on storage.objects for insert
  with check (
    bucket_id = 'work-images'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated can update work images"
  on storage.objects for update
  using (
    bucket_id = 'work-images'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated can delete work images"
  on storage.objects for delete
  using (
    bucket_id = 'work-images'
    and auth.role() = 'authenticated'
  );

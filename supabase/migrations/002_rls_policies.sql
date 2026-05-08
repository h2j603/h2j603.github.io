-- ========================================
-- 002_rls_policies.sql
-- ========================================

alter table works enable row level security;

create policy "Public can read published works"
  on works for select
  using (published = true);

create policy "Authenticated can manage works"
  on works for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table work_images enable row level security;

create policy "Public can read images of published works"
  on work_images for select
  using (
    exists (
      select 1 from works
      where works.id = work_images.work_id
      and works.published = true
    )
  );

create policy "Authenticated can manage images"
  on work_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table site_settings enable row level security;

create policy "Public can read settings"
  on site_settings for select
  using (true);

create policy "Authenticated can update settings"
  on site_settings for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ========================================
-- 001_initial_schema.sql
-- ========================================

create table works (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_kr text not null,
  title_en text not null,
  description_kr text not null default '',
  description_en text not null default '',
  categories text[] not null default '{}',
  order_index int not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint title_kr_length check (char_length(title_kr) between 1 and 100),
  constraint title_en_length check (char_length(title_en) between 1 and 100),
  constraint valid_categories check (
    categories <@ array['T','W','E','I','ETC']::text[]
  )
);

create index works_order_idx on works(order_index);
create index works_categories_idx on works using gin(categories);
create index works_published_idx on works(published);

create table work_images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  storage_path text not null,
  order_index int not null,
  alt_text text,
  width int,
  height int,
  created_at timestamptz not null default now()
);

create index work_images_work_id_idx on work_images(work_id);
create index work_images_order_idx on work_images(work_id, order_index);

create table site_settings (
  id int primary key default 1,
  layout jsonb not null default '{}',
  grid jsonb not null default '{}',
  typography jsonb not null default '{}',
  colors jsonb not null default '{}',
  panel jsonb not null default '{}',
  detail jsonb not null default '{}',
  show_archive_link boolean not null default false,
  updated_at timestamptz not null default now(),

  constraint single_row check (id = 1)
);

insert into site_settings (id, layout, grid, typography, colors, panel, detail)
values (1,
  '{"containerRatio": 5, "mobileRatio": 4, "outerMargin": 24, "container1Position": "left"}'::jsonb,
  '{"size": 9, "cellTextSize": 80, "cellBorderWidth": 1, "cellGap": 0, "emptyCellStyle": "lines"}'::jsonb,
  '{"baseFontSize": 16, "lineHeight": 1.5}'::jsonb,
  '{"background": "#ffffff", "text": "#000000", "categoryActive": "#000000", "categoryActiveText": "#ffffff", "border": "#000000", "hover": "rgba(0,0,0,0.1)"}'::jsonb,
  '{"activeStyle": "fill", "cornerDecoration": "none", "cornerCustom": ""}'::jsonb,
  '{"imageGap": 48, "titleToImage": 64, "imageToDescription": 64, "descriptionLineHeight": 1.7}'::jsonb
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_works_updated_at before update on works
  for each row execute function update_updated_at_column();

create trigger update_site_settings_updated_at before update on site_settings
  for each row execute function update_updated_at_column();

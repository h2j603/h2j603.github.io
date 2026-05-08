-- hyuk.xyz Supabase schema
-- Run in Supabase SQL editor (one time).
-- Before running, set ADMIN_EMAIL below to your admin email.

-- =========================================================
-- 1. Admin helper
-- =========================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'h2j603@naver.com'
$$;

-- =========================================================
-- 2. Tables
-- =========================================================
create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('print','web')),
  title text not null,
  year text,
  image_path text,
  external_url text,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_category_sort_idx
  on public.works (category, sort_order);

create table if not exists public.bullets (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('bio','notes')),
  content text not null,
  desktop_only boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bullets_section_sort_idx
  on public.bullets (section, sort_order);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists works_touch on public.works;
create trigger works_touch before update on public.works
  for each row execute function public.touch_updated_at();

drop trigger if exists bullets_touch on public.bullets;
create trigger bullets_touch before update on public.bullets
  for each row execute function public.touch_updated_at();

-- =========================================================
-- 3. Row Level Security
-- =========================================================
alter table public.works   enable row level security;
alter table public.bullets enable row level security;

drop policy if exists "works read"    on public.works;
drop policy if exists "works write"   on public.works;
drop policy if exists "bullets read"  on public.bullets;
drop policy if exists "bullets write" on public.bullets;

create policy "works read"   on public.works   for select to anon, authenticated using (true);
create policy "works write"  on public.works   for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bullets read" on public.bullets for select to anon, authenticated using (true);
create policy "bullets write" on public.bullets for all   to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- 4. Storage bucket for work images
-- =========================================================
insert into storage.buckets (id, name, public)
values ('works', 'works', true)
on conflict (id) do nothing;

drop policy if exists "works obj read"   on storage.objects;
drop policy if exists "works obj write"  on storage.objects;

create policy "works obj read"  on storage.objects for select to anon, authenticated
  using (bucket_id = 'works');

create policy "works obj write" on storage.objects for all to authenticated
  using (bucket_id = 'works' and public.is_admin())
  with check (bucket_id = 'works' and public.is_admin());

-- =========================================================
-- 5. (Optional) seed existing static content
-- =========================================================
-- Bio bullets (혁은 지금)
insert into public.bullets (section, content, desktop_only, sort_order) values
  ('bio', '<strong>爀</strong>은 2027년 2월까지 군 복무한다.', false, 10),
  ('bio', '<strong>爀</strong>은 <a href="https://birdcall.online/">Birdcall</a>에서 <a href="https://websitesite.xyz/">지수</a>에게 Html을 배웠다.', false, 20),
  ('bio', '<strong>爀</strong>은 20세기 일본 그래픽에 관심이 생겼다.', true, 30),
  ('bio', '<strong>爀</strong>은 윤상과 이소라, ABBA를 즐겨 듣는다.', false, 40),
  ('bio', '<strong>爀</strong>은 이름이 가지는 의미를 고민 중이다.', false, 50),
  ('bio', '<strong>爀</strong>은 홍익대학교에서 시각디자인을 공부한다.', false, 60),
  ('bio', '<strong>爀</strong>은 <a href="https://h2j603.github.io/theconespiracy/">트래픽콘</a> 사진을 수집 중이다.', false, 70),
  ('bio', '<strong>爀</strong>은 아름다운 노랫말을 수집 중이다.', true, 80),
  ('bio', '<strong>爀</strong>은 책과 웹을 만들고, 글자를 그린다.', false, 90),
  ('bio', '<strong>爀</strong>은 아주 느슨하게 독일어를 공부 중이다.', true, 100),
  ('bio', '<strong>爀</strong>은 정진을 위한 원동력을 찾고 있다.', false, 110)
on conflict do nothing;

-- Notes bullets (그 밖의 것들)
insert into public.bullets (section, content, desktop_only, sort_order) values
  ('notes', '이 웹은 Kohei Sugiura의 <a href="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBIpXt1j2exVUbKDPFzZOoDkSpeSSNIPBWLA&s">『印刷ユーザーガイド』</a>에서 많은 영향을 받았다.', false, 10),
  ('notes', '연락은 <a href="#page2">명함</a>의 정보를 참고해주기를 바란다.', false, 20),
  ('notes', '이외 그래픽 작업에 대한 정보는 <a href="https://www.instagram.com/aoystu/">인스타그램</a>을 찾아와주길 바란다.', false, 30),
  ('notes', '거리에서 트래픽콘을 발견한다면 <a href="mailto:aoystu@gmail.com">이메일</a>로 제보해주길 바란다.', false, 40)
on conflict do nothing;

-- Web works (책 리스트)
insert into public.works (category, title, year, external_url, sort_order) values
  ('web', '『혁의 Formal Home』', '2025', 'https://h2j603.github.io/hyuk/', 10),
  ('web', '『버텨내기를 위한 매뉴얼』', '2025', 'https://h2j603.github.io/wiki/', 20),
  ('web', '『The Conespiracy 2』', '2025', 'https://h2j603.github.io/theconespiracy2/', 30),
  ('web', '『The Conespiracy』', '2025', 'https://h2j603.github.io/theconespiracy/', 40),
  ('web', '『오직 NONATAE를 위한···』', '2025', 'https://h2j603.github.io/nonataetalk/', 50),
  ('web', '『Halftone Generator』', '2025', 'https://h2j603.github.io/halftone/', 60),
  ('web', '『Weekly Log』', '2025', 'https://h2j603.github.io/weeklylog/', 70),
  ('web', '『Memodummy』', '2025', 'https://h2j603.github.io/memodummy/', 80)
on conflict do nothing;

-- ===========================================================================
-- HORIZON — complete database migration.
-- Paste this whole file ONCE into the Supabase SQL editor and run it.
-- It runs top-to-bottom: extensions -> tables -> trigger -> RLS -> policies
-- -> storage -> seed data. Safe to re-run (guards included).
-- ===========================================================================

-- 1. Extensions -------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- 2. profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'designer'
    check (role in ('designer', 'tech', 'copywriter', 'accessibility', 'admin')),
  created_at timestamptz not null default now()
);

-- 3. projects ---------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  source text not null check (source in ('figma', 'sketch', 'xd', 'ai', 'kit')),
  devices text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

-- 4. project_versions -------------------------------------------------------
create table if not exists public.project_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_number int not null,
  label text not null,
  system_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

-- 5. folders ----------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  kind text not null
    check (kind in ('components', 'templates', 'assets', 'documentation')),
  created_at timestamptz not null default now()
);

-- 6. files ------------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  name text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

-- 7. reviews ----------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage text not null check (stage in ('copy', 'tech', 'accessibility', 'design')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, stage)
);

-- 8. generations ------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  filters jsonb not null default '{}',
  system_json jsonb,
  created_at timestamptz not null default now()
);

-- 9. shop_kits --------------------------------------------------------------
create table if not exists public.shop_kits (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  industry text not null,
  likes int not null default 0,
  views int not null default 0,
  cover_gradient text not null,
  starter_json jsonb,
  is_free boolean not null default true,
  created_at timestamptz not null default now()
);

-- 10. New-user trigger ------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 11. Enable RLS on all eight tables ---------------------------------------
alter table public.profiles         enable row level security;
alter table public.projects         enable row level security;
alter table public.project_versions enable row level security;
alter table public.folders          enable row level security;
alter table public.files            enable row level security;
alter table public.reviews          enable row level security;
alter table public.generations      enable row level security;
alter table public.shop_kits        enable row level security;

-- 12. Policies --------------------------------------------------------------

-- profiles: everyone authenticated can read; you can only update your own row.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- projects: owner-scoped, all four verbs.
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated using (owner_id = auth.uid());

-- project_versions: gated by ownership of the parent project.
drop policy if exists "project_versions_select" on public.project_versions;
create policy "project_versions_select" on public.project_versions
  for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "project_versions_insert" on public.project_versions;
create policy "project_versions_insert" on public.project_versions
  for insert to authenticated
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "project_versions_update" on public.project_versions;
create policy "project_versions_update" on public.project_versions
  for update to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "project_versions_delete" on public.project_versions;
create policy "project_versions_delete" on public.project_versions
  for delete to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

-- folders: gated by ownership of the parent project.
drop policy if exists "folders_select" on public.folders;
create policy "folders_select" on public.folders
  for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "folders_insert" on public.folders;
create policy "folders_insert" on public.folders
  for insert to authenticated
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "folders_update" on public.folders;
create policy "folders_update" on public.folders
  for update to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "folders_delete" on public.folders;
create policy "folders_delete" on public.folders
  for delete to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

-- files: gated by ownership of the parent project.
drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files
  for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files
  for insert to authenticated
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "files_update" on public.files;
create policy "files_update" on public.files
  for update to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "files_delete" on public.files;
create policy "files_delete" on public.files
  for delete to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

-- reviews: gated by ownership of the parent project.
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews
  for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
  for insert to authenticated
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "reviews_update" on public.reviews;
create policy "reviews_update" on public.reviews
  for update to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "reviews_delete" on public.reviews;
create policy "reviews_delete" on public.reviews
  for delete to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.owner_id = auth.uid()));

-- generations: owner-only via user_id.
drop policy if exists "generations_select" on public.generations;
create policy "generations_select" on public.generations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "generations_insert" on public.generations;
create policy "generations_insert" on public.generations
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "generations_update" on public.generations;
create policy "generations_update" on public.generations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "generations_delete" on public.generations;
create policy "generations_delete" on public.generations
  for delete to authenticated using (user_id = auth.uid());

-- shop_kits: read-only for everyone authenticated (no insert/update/delete).
drop policy if exists "shop_kits_select" on public.shop_kits;
create policy "shop_kits_select" on public.shop_kits
  for select to authenticated using (true);

-- 13. Storage ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

drop policy if exists "uploads_insert" on storage.objects;
create policy "uploads_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_select" on storage.objects;
create policy "uploads_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_delete" on storage.objects;
create policy "uploads_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 14. Seed 12 shop kits -----------------------------------------------------
-- Each kit shares one minimal-but-valid HorizonSystem starter; the kit title
-- is injected as the system name. Only seeds when the table is empty.
insert into public.shop_kits
  (title, author, industry, likes, views, cover_gradient, starter_json)
select
  v.title, v.author, v.industry, v.likes, v.views, v.cover_gradient,
  jsonb_set(base.j, '{name}', to_jsonb(v.title))
from (values
  ('Foodie App UI Kit',      'Marvis',          'E-commerce',            3800, 179000, 'linear-gradient(135deg,#FDE8E8,#FCD9BD)'),
  ('Android UI Kit',         'Material Design', 'SaaS',                  6200, 179000, 'linear-gradient(135deg,#D1FAE5,#A7F3D0)'),
  ('Dashboard UI Kit',       'ByeWind',         'Enterprise',            3800, 178000, 'linear-gradient(135deg,#1F2937,#4B5563)'),
  ('Drive Motors Kit',       'Tesla Design',    'Automotive',            2800, 164000, 'linear-gradient(135deg,#E2E8F0,#CBD5E1)'),
  ('Ant Design System',      'Matt Wierzbicki', 'SaaS',                  4300, 164000, 'linear-gradient(135deg,#E0F2FE,#BAE6FD)'),
  ('Microsoft Fluent 2 Web', 'Microsoft',       'Enterprise',            7400, 162000, 'linear-gradient(135deg,#EFF6FF,#DBEAFE)'),
  ('Base Gallery',           'Uber',            'Agency',                7700, 160000, 'linear-gradient(135deg,#111827,#1F2937)'),
  ('FinTrack Banking Kit',   'Horizon Labs',    'Banking & FinTech',     5100, 158000, 'linear-gradient(135deg,#DCFCE7,#BBF7D0)'),
  ('MediCare Health System', 'Wellframe',       'Healthcare',            3300, 151000, 'linear-gradient(135deg,#CFFAFE,#A5F3FC)'),
  ('Voyage Travel Kit',      'Wanderlust',      'Travel & Hospitality',  4600, 149000, 'linear-gradient(135deg,#FEF3C7,#FDE68A)'),
  ('Assure Insurance UI',    'Lemonade',        'Insurance',             2100, 133000, 'linear-gradient(135deg,#FCE7F3,#FBCFE8)'),
  ('Telco Connect Kit',      'Vodafone',        'Telecommunications',    3900, 128000, 'linear-gradient(135deg,#FEE2E2,#FECACA)')
) as v(title, author, industry, likes, views, cover_gradient)
cross join (
  select '{
    "name": "Starter",
    "description": "A production ready starter design system.",
    "colors": {
      "primary": {"50":"#EEF2FF","100":"#E0E7FF","200":"#C7D2FE","300":"#A5B4FC","400":"#818CF8","500":"#6366F1","600":"#4F46E5","700":"#4338CA","800":"#3730A3","900":"#312E81"},
      "secondary": {"50":"#F5F3FF","100":"#EDE9FE","200":"#DDD6FE","300":"#C4B5FD","400":"#A78BFA","500":"#8B5CF6","600":"#7C3AED","700":"#6D28D9","800":"#5B21B6","900":"#4C1D95"},
      "neutral": {"50":"#F9FAFB","100":"#F3F4F6","200":"#E5E7EB","300":"#D1D5DB","400":"#9CA3AF","500":"#6B7280","600":"#4B5563","700":"#374151","800":"#1F2937","900":"#111827"},
      "semantic": {"success":"#05CD99","warning":"#FFB547","error":"#EE5D50","info":"#4F46E5"}
    },
    "typography": {
      "fontFamily": "Plus Jakarta Sans",
      "scale": [
        {"name":"Display Large","size":"48px","lineHeight":"56px","weight":800,"usage":"Hero headlines"},
        {"name":"Title Large","size":"22px","lineHeight":"28px","weight":700,"usage":"Section titles"},
        {"name":"Body Large","size":"16px","lineHeight":"24px","weight":400,"usage":"Primary body text"},
        {"name":"Body Small","size":"14px","lineHeight":"20px","weight":400,"usage":"Secondary text"}
      ]
    },
    "spacing": {"base":4,"scale":[4,8,12,16,24,32,48,64]},
    "radius": {"sm":"6px","md":"10px","lg":"16px","full":"9999px"},
    "shadows": [
      {"name":"sm","value":"0 1px 2px rgba(16,24,40,0.06)"},
      {"name":"md","value":"0 4px 12px rgba(16,24,40,0.10)"},
      {"name":"lg","value":"0 12px 32px rgba(16,24,40,0.14)"}
    ],
    "components": [
      {"type":"Button","variants":["Primary","Secondary","Outline"],"states":["Default","Hover","Disabled"],"specs":{"height":"44px","paddingX":"24px","radius":"9999px","fontSize":"14px"},"guidelines":"Use primary for the main action; one primary per view."},
      {"type":"Text Field","variants":["Default","Focused","Error"],"states":["Default","Focused","Disabled"],"specs":{"height":"44px","paddingX":"16px","radius":"12px","fontSize":"14px"},"guidelines":"Always pair with a visible label; show errors inline."},
      {"type":"Card","variants":["Elevated","Outlined"],"states":["Default","Hover"],"specs":{"height":"auto","paddingX":"24px","radius":"16px","fontSize":"14px"},"guidelines":"Group related content; keep to one primary action."}
    ],
    "documentation": [
      {"section":"Overview","content":"Horizon starter system. A production ready foundation covering color, type, spacing and core components."},
      {"section":"Color Usage","content":"Primary drives key actions and focus. Neutrals carry surfaces and text. Reserve semantic colors for status only."},
      {"section":"Typography Rules","content":"One type scale, four steps. Display for hero moments, body for reading. Keep line length between 45 and 75 characters."},
      {"section":"Spacing & Layout","content":"Built on a 4pt base. Compose padding and gaps from the scale for consistent vertical rhythm across breakpoints."},
      {"section":"Component Guidelines","content":"Every component ships with variants and states. Compose, do not fork. Keep one primary action per view."},
      {"section":"Accessibility","content":"Text meets WCAG AA contrast. Focus states are always visible. Motion respects reduced motion settings."}
    ]
  }'::jsonb as j
) base
where not exists (select 1 from public.shop_kits);

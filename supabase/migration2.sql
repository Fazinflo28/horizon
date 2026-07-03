-- ===========================================================================
-- HORIZON — migration 2: Figma Connect module (additive only).
-- Paste into the Supabase SQL editor and run. Safe to re-run.
-- ===========================================================================

-- 1. Figma connections (one per user) --------------------------------------
create table if not exists public.figma_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  encrypted_token text not null,
  figma_user_handle text,
  figma_user_img text,
  created_at timestamptz not null default now()
);

-- 2. Figma metadata on projects --------------------------------------------
alter table public.projects add column if not exists figma_file_key text;
alter table public.projects add column if not exists figma_file_name text;
alter table public.projects add column if not exists figma_last_modified timestamptz;
alter table public.projects add column if not exists figma_synced_at timestamptz;

-- 3. Per-version preview images (component type -> {nodeId,imageUrl,fetchedAt})
alter table public.project_versions add column if not exists preview_map jsonb;

-- 4. RLS + owner-only policies ---------------------------------------------
alter table public.figma_connections enable row level security;

drop policy if exists "figma_connections_select" on public.figma_connections;
create policy "figma_connections_select" on public.figma_connections
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "figma_connections_insert" on public.figma_connections;
create policy "figma_connections_insert" on public.figma_connections
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "figma_connections_update" on public.figma_connections;
create policy "figma_connections_update" on public.figma_connections
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "figma_connections_delete" on public.figma_connections;
create policy "figma_connections_delete" on public.figma_connections
  for delete to authenticated using (user_id = auth.uid());

-- Projects table for SAI Company HQ
-- Run this in Supabase SQL Editor: Dashboard → SQL → New query

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null default '',
  status text not null default 'on_track'
    check (status in ('on_track', 'at_risk', 'delayed', 'completed')),
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  lead text not null default '',
  tasks_total integer not null default 0
    check (tasks_total >= 0),
  tasks_completed integer not null default 0
    check (tasks_completed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- API routes enforce owner-only writes; RLS allows server-side anon key access.
create policy "projects_select"
  on public.projects for select
  using (true);

create policy "projects_insert"
  on public.projects for insert
  with check (true);

create policy "projects_update"
  on public.projects for update
  using (true)
  with check (true);

create policy "projects_delete"
  on public.projects for delete
  using (true);

-- Seed starter data (safe to re-run: only inserts when table is empty)
insert into public.projects (name, objective, status, progress, lead, tasks_total, tasks_completed)
select * from (values
  ('Sentra Deployment Module', 'Build automated software deployment across managed endpoints', 'delayed', 62, 'Arjun Mehta', 34, 21),
  ('FaceNova v2 Dashboard', 'Multi-site attendance dashboard with real-time analytics', 'on_track', 78, 'Priya Sharma', 28, 22),
  ('HYGYR Premium Tier', 'Launch paid tier with advanced templates and AI writing', 'on_track', 45, 'Priya Sharma', 22, 10),
  ('Unite Platform', 'Unified company operating system architecture phase 1', 'at_risk', 28, 'Karthik Nair', 40, 11)
) as seed(name, objective, status, progress, lead, tasks_total, tasks_completed)
where not exists (select 1 from public.projects limit 1);

-- Phase 1: Company memory, releases, activity logs

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  type text not null default 'product'
    check (type in ('product', 'engineering', 'customer', 'decision', 'business')),
  project_id uuid references public.projects(id) on delete set null,
  created_by text not null default 'Mukul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null,
  title text not null,
  description text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'ready', 'released', 'rolled_back')),
  release_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists stage text default 'engineer'
    check (stage in (
      'product_manager', 'architect', 'project_manager', 'engineer',
      'qa', 'devops', 'documentation'
    ));

drop trigger if exists memories_updated_at on public.memories;
create trigger memories_updated_at before update on public.memories
  for each row execute function public.set_updated_at();

alter table public.memories enable row level security;
alter table public.releases enable row level security;
alter table public.activity_logs enable row level security;

do $$ declare t text;
begin
  foreach t in array array['memories', 'releases', 'activity_logs'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select using (true)', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (true)', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update using (true) with check (true)', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_delete on public.%I for delete using (true)', t, t);
  end loop;
end $$;

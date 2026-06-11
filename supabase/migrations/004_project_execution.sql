-- Project ownership & execution flow

alter table public.projects
  add column if not exists business_owner text not null default 'Mukul',
  add column if not exists project_lead_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists project_lead_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists health_score integer not null default 80
    check (health_score >= 0 and health_score <= 100);

create table if not exists public.project_objectives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.project_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists objective_id uuid references public.project_objectives(id) on delete set null,
  add column if not exists feature_id uuid references public.project_features(id) on delete set null,
  add column if not exists due_date timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists knowledge_generated text not null default '';

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_type text not null default 'system'
    check (actor_type in ('owner', 'employee', 'agent', 'system')),
  actor_id text,
  actor_name text not null default 'SAI',
  action text not null,
  notes text not null default '',
  outcome text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.project_timeline (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text not null default '',
  actor_name text not null default 'SAI',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  memory_type text not null default 'knowledge'
    check (memory_type in (
      'requirement', 'decision', 'customer', 'technical', 'feature',
      'lesson', 'release', 'architecture', 'knowledge'
    )),
  title text not null,
  summary text not null default '',
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  workflow_step_key text,
  deliverable_type text not null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  approval_type text not null
    check (approval_type in ('architecture', 'qa', 'release', 'documentation', 'general')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approver_name text not null default 'Mukul',
  notes text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.workflow_runs
  add column if not exists name text not null default 'SDLC Workflow',
  add column if not exists owner text not null default 'Mukul',
  add column if not exists completed_at timestamptz;

-- Backfill business owner from legacy lead where possible
update public.projects
set business_owner = coalesce(nullif(business_owner, ''), 'Mukul')
where business_owner is null or business_owner = '';

-- RLS for new tables
alter table public.project_objectives enable row level security;
alter table public.project_features enable row level security;
alter table public.task_history enable row level security;
alter table public.project_timeline enable row level security;
alter table public.project_memory enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_approvals enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'project_objectives', 'project_features', 'task_history', 'project_timeline',
    'project_memory', 'project_deliverables', 'project_approvals'
  ] loop
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

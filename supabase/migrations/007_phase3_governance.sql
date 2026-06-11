-- Phase 3: Governance, approvals, company timeline, agent metrics

alter table public.projects
  add column if not exists governance_profile text not null default 'standard'
    check (governance_profile in ('strict', 'standard', 'autonomous')),
  add column if not exists workflow_mode text not null default 'semi_autonomous'
    check (workflow_mode in ('manual', 'semi_autonomous', 'autonomous'));

alter table public.workflow_runs
  add column if not exists workflow_mode text not null default 'semi_autonomous'
    check (workflow_mode in ('manual', 'semi_autonomous', 'autonomous')),
  add column if not exists governance_status text not null default 'normal'
    check (governance_status in ('normal', 'waiting_for_approval', 'waiting_for_revision', 'escalated'));

alter table public.agents
  add column if not exists authority_level integer not null default 2
    check (authority_level >= 1 and authority_level <= 5);

create table if not exists public.approval_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  approval_type text not null,
  mode text not null default 'manual'
    check (mode in ('manual', 'auto', 'conditional', 'escalated')),
  approver_role text not null default 'founder',
  conditions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_step_id uuid references public.workflow_run_steps(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  approval_type text not null,
  approval_mode text not null default 'manual'
    check (approval_mode in ('manual', 'auto', 'conditional', 'escalated')),
  title text not null,
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revision_required', 'auto_approved', 'escalated')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  requested_by text not null default 'SAI',
  approved_by text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  comments text not null default '',
  artifact_content text not null default ''
);

create table if not exists public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.workflow_approvals(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_discussions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade,
  author text not null,
  author_type text not null default 'agent'
    check (author_type in ('founder', 'agent', 'employee')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_timeline (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  title text not null,
  description text not null default '',
  actor text not null default 'SAI',
  severity text not null default 'info'
    check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now()
);

create index if not exists company_timeline_created_at_idx on public.company_timeline(created_at desc);
create index if not exists workflow_approvals_status_idx on public.workflow_approvals(status);
create index if not exists workflow_approvals_workflow_id_idx on public.workflow_approvals(workflow_id);

create table if not exists public.agent_metrics (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  tasks_assigned integer not null default 0,
  tasks_completed integer not null default 0,
  approvals_requested integer not null default 0,
  approvals_passed integer not null default 0,
  approvals_rejected integer not null default 0,
  auto_approved_actions integer not null default 0,
  escalated_actions integer not null default 0,
  documents_created integer not null default 0,
  memories_created integer not null default 0,
  decisions_created integer not null default 0,
  workflows_contributed integer not null default 0,
  last_active timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.founder_overrides (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text not null default '',
  actor text not null default 'Mukul',
  created_at timestamptz not null default now()
);

alter table public.approval_policies enable row level security;
alter table public.workflow_approvals enable row level security;
alter table public.approval_comments enable row level security;
alter table public.workflow_discussions enable row level security;
alter table public.company_timeline enable row level security;
alter table public.agent_metrics enable row level security;
alter table public.founder_overrides enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'approval_policies', 'workflow_approvals', 'approval_comments',
    'workflow_discussions', 'company_timeline', 'agent_metrics', 'founder_overrides'
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

insert into public.approval_policies (name, approval_type, mode, approver_role, conditions) values
  ('Requirements Review', 'requirements', 'manual', 'product_manager', '{}'),
  ('Architecture Review', 'architecture', 'manual', 'solution_architect', '{}'),
  ('Milestone Approval', 'milestones', 'manual', 'project_manager', '{}'),
  ('Task Plan Approval', 'task_plan', 'auto', 'orchestrator', '{}'),
  ('Documentation Auto', 'document', 'auto', 'documentation', '{"doc_type":"sop"}'),
  ('Patch Release', 'release', 'auto', 'devops', '{"release_type":"patch"}'),
  ('Major Release', 'release', 'escalated', 'founder', '{"release_type":"major"}'),
  ('Database Migration', 'database_change', 'escalated', 'founder', '{}'),
  ('Security Change', 'security', 'escalated', 'founder', '{}'),
  ('Infrastructure Change', 'infrastructure', 'escalated', 'founder', '{}'),
  ('Decision Review', 'decision', 'manual', 'coo', '{}')
on conflict do nothing;

update public.projects set governance_profile = 'strict'
  where name ilike '%sentra%' or name ilike '%facenova%';
update public.projects set governance_profile = 'autonomous'
  where name ilike '%research%' or name ilike '%experiment%';

update public.agents set authority_level = 1
  where role ilike '%documentation%' or role ilike '%qa%' or role ilike '%quality%';
update public.agents set authority_level = 2
  where role ilike '%engineer%' or role ilike '%devops%' or role ilike '%project manager%';
update public.agents set authority_level = 3
  where role ilike '%architect%' or role ilike '%product%';
update public.agents set authority_level = 4
  where role ilike '%ceo%' or role ilike '%coo%' or name ilike '%ceo%' or name ilike '%coo%';

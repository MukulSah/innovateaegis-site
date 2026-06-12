-- Execution sessions, artifacts, and founder-gated objectives

-- Extend project_objectives for founder → CEO flow
alter table public.project_objectives drop constraint if exists project_objectives_status_check;
alter table public.project_objectives
  add column if not exists strategic_brief jsonb not null default '{}'::jsonb;

alter table public.project_objectives
  add constraint project_objectives_status_check
  check (status in ('pending_ceo', 'pending_founder', 'active', 'completed', 'cancelled'));

-- Session fields on workflow_runs (UI alias: Session)
alter table public.workflow_runs
  add column if not exists session_number int,
  add column if not exists executive_sponsor_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists session_owner_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists current_stage text,
  add column if not exists strategic_brief jsonb not null default '{}'::jsonb,
  add column if not exists session_status text not null default 'running'
    check (session_status in (
      'pending_ceo', 'pending_founder', 'running',
      'waiting_approval', 'completed', 'failed'
    ));

-- One active session per project (locked rule)
create unique index if not exists one_active_session_per_project
  on public.workflow_runs (project_id)
  where status = 'running';

-- Session artifacts: Turn → Artifact → Memory
create table if not exists public.session_artifacts (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete cascade,
  runtime_session_id uuid references public.agent_runtime_sessions(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  step_key text not null,
  turn_number int not null default 1,
  input_summary text not null default '',
  output_summary text not null default '',
  decision text,
  artifact_name text,
  artifact_type text,
  artifact_ref_id uuid,
  artifact_ref_url text,
  created_at timestamptz not null default now(),
  check (workflow_run_id is not null or objective_id is not null)
);

create index if not exists session_artifacts_workflow_idx
  on public.session_artifacts(workflow_run_id, created_at desc);
create index if not exists session_artifacts_objective_idx
  on public.session_artifacts(objective_id, created_at desc);

-- Context engine tracking
alter table public.agent_runtime_sessions
  add column if not exists context_loaded_at timestamptz;

-- Updated approval policies (founder gates + COO task plan)
update public.approval_policies
  set approver_role = 'founder', mode = 'manual'
  where approval_type in ('requirements', 'architecture', 'release');

update public.approval_policies
  set approver_role = 'coo', mode = 'manual'
  where approval_type in ('milestones', 'task_plan');

insert into public.approval_policies (name, approval_type, mode, approver_role, conditions)
values
  ('Strategic Objective', 'strategic_objective', 'manual', 'founder', '{}'),
  ('Execution Readiness', 'execution_readiness', 'manual', 'orchestrator', '{}')
on conflict do nothing;

-- Pre-session approvals (strategic objective before workflow exists)
alter table public.workflow_approvals
  alter column workflow_id drop not null;

-- RLS for session_artifacts
alter table public.session_artifacts enable row level security;
drop policy if exists session_artifacts_select on public.session_artifacts;
drop policy if exists session_artifacts_insert on public.session_artifacts;
drop policy if exists session_artifacts_update on public.session_artifacts;
drop policy if exists session_artifacts_delete on public.session_artifacts;
create policy session_artifacts_select on public.session_artifacts for select using (true);
create policy session_artifacts_insert on public.session_artifacts for insert with check (true);
create policy session_artifacts_update on public.session_artifacts for update using (true) with check (true);
create policy session_artifacts_delete on public.session_artifacts for delete using (true);

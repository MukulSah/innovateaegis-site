-- COO-managed session handoffs tied to artifacts

create table if not exists public.session_handoffs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  artifact_id uuid references public.session_artifacts(id) on delete set null,
  artifact_name text,
  completed_by_agent_id uuid references public.agents(id) on delete set null,
  assigned_to_agent_id uuid references public.agents(id) on delete set null,
  assigned_by_agent_id uuid references public.agents(id) on delete set null,
  from_step_key text,
  to_step_key text,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists session_handoffs_workflow_idx
  on public.session_handoffs (workflow_run_id, created_at desc);

create index if not exists session_handoffs_assigned_to_idx
  on public.session_handoffs (assigned_to_agent_id, status);

alter table public.session_handoffs enable row level security;

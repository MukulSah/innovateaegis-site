-- COO escalation records for blocked sessions and approval delays

create table if not exists public.session_escalations (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  issue text not null,
  owner text not null default 'Founder',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_by_agent_id uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists session_escalations_workflow_idx
  on public.session_escalations (workflow_run_id, created_at desc);

alter table public.session_escalations enable row level security;

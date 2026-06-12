-- Execution release engine: session execution pointers + debug trail

alter table public.workflow_runs
  add column if not exists current_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists next_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists current_artifact text,
  add column if not exists current_deliverable text,
  add column if not exists execution_released_at timestamptz;

create table if not exists public.execution_release_trails (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  steps jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists execution_release_trails_workflow_idx
  on public.execution_release_trails(workflow_run_id, created_at desc);

alter table public.execution_release_trails enable row level security;
drop policy if exists execution_release_trails_select on public.execution_release_trails;
create policy execution_release_trails_select on public.execution_release_trails for select using (true);

-- AI Reliability & Retry Policy

alter table public.company_ai_settings
  add column if not exists fallback_provider_id uuid references public.ai_providers(id) on delete set null;

create table if not exists public.ai_execution_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  agent_name text not null default '',
  step_key text,
  workflow_stage text,
  artifact_requested text,
  provider text not null default '',
  model text not null default '',
  attempt_count smallint not null default 1,
  success boolean not null default false,
  used_fallback boolean not null default false,
  used_template boolean not null default false,
  timed_out boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_execution_events_workflow on public.ai_execution_events(workflow_run_id);
create index if not exists idx_ai_execution_events_created on public.ai_execution_events(created_at desc);
create index if not exists idx_ai_execution_events_template on public.ai_execution_events(used_template) where used_template = true;

alter table public.ai_execution_events enable row level security;

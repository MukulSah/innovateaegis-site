-- Phase 3: Context Isolation Engine, AI Reliability Queue, Founder Operations

-- Execution mode: free providers use intelligent recovery queue before template fallback
alter table public.company_ai_settings
  add column if not exists execution_mode text not null default 'free'
    check (execution_mode in ('free', 'paid'));

-- Session-scoped context snapshots per agent turn
create table if not exists public.session_contexts (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  step_key text,
  role_key text not null default 'default',
  allowed_sources text[] not null default '{}',
  excluded_sources text[] not null default '{}',
  token_budget int not null default 6000,
  actual_tokens int not null default 0,
  context_hash text,
  isolation_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create index if not exists idx_session_contexts_workflow on public.session_contexts(workflow_run_id, created_at desc);

-- Memory buckets: global / project / session
create table if not exists public.session_memory_buckets (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  bucket_type text not null check (bucket_type in ('global', 'project', 'session')),
  memory_key text not null,
  content jsonb not null default '{}',
  token_estimate int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_run_id, bucket_type, memory_key)
);

create index if not exists idx_session_memory_buckets_workflow on public.session_memory_buckets(workflow_run_id);

-- AI recovery queue for free-tier throttling
create table if not exists public.ai_retry_queue (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  runtime_session_id uuid references public.agent_runtime_sessions(id) on delete set null,
  step_key text not null,
  execution_payload jsonb not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'waiting', 'processing', 'completed', 'failed', 'cancelled', 'template_fallback')),
  retry_count smallint not null default 0,
  max_retries smallint not null default 4,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_retry_queue_next on public.ai_retry_queue(next_attempt_at) where status in ('queued', 'waiting');
create index if not exists idx_ai_retry_queue_workflow on public.ai_retry_queue(workflow_run_id);

-- Session finalization audit trail
create table if not exists public.session_finalization_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null check (event_type in ('knowledge_archive_detected', 'steps_completed', 'session_closed', 'finalization_blocked')),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_session_finalization_events_workflow on public.session_finalization_events(workflow_run_id, created_at desc);

-- Founder operational chat actions (approval-gated)
create table if not exists public.founder_chat_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action_type text not null check (action_type in (
    'retry_step', 'resume_session', 'reconcile_state', 'force_finalize',
    'assign_agent', 'pause_session', 'close_session', 'escalate_coo', 'escalate_ceo'
  )),
  action_payload jsonb not null default '{}',
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'rejected', 'executed', 'failed')),
  proposed_by text not null default 'founder_chat',
  approved_by text,
  founder_question text,
  system_summary text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists idx_founder_chat_actions_status on public.founder_chat_actions(status, created_at desc);

create table if not exists public.founder_chat_action_logs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.founder_chat_actions(id) on delete cascade,
  log_level text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Provider health metrics (rolling window)
create table if not exists public.provider_health_metrics (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text,
  success_count int not null default 0,
  failure_count int not null default 0,
  timeout_count int not null default 0,
  queue_count int not null default 0,
  template_fallback_count int not null default 0,
  avg_response_ms int,
  health_status text not null default 'healthy'
    check (health_status in ('healthy', 'degraded', 'throttled', 'offline')),
  window_start timestamptz not null default now(),
  window_end timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_health_provider on public.provider_health_metrics(provider, updated_at desc);

alter table public.session_contexts enable row level security;
alter table public.session_memory_buckets enable row level security;
alter table public.ai_retry_queue enable row level security;
alter table public.session_finalization_events enable row level security;
alter table public.founder_chat_actions enable row level security;
alter table public.founder_chat_action_logs enable row level security;
alter table public.provider_health_metrics enable row level security;

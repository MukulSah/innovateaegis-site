-- Phase 5: AI runtime, multi-agent collaboration, founder AI configuration

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null
    check (provider_name in (
      'openai', 'azure_openai', 'anthropic', 'google_gemini', 'mistral',
      'nvidia_nim', 'huggingface', 'openrouter', 'ollama', 'lm_studio'
    )),
  api_key_encrypted text not null default '',
  endpoint text not null default '',
  model text not null default '',
  enabled boolean not null default true,
  default_provider boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_ai_settings (
  id uuid primary key default gen_random_uuid(),
  model_mode text not null default 'single'
    check (model_mode in ('single', 'per_agent')),
  default_provider_id uuid references public.ai_providers(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.company_ai_settings (model_mode)
select 'single' where not exists (select 1 from public.company_ai_settings);

create table if not exists public.agent_ai_config (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model text,
  temperature numeric(3,2) not null default 0.70
    check (temperature >= 0 and temperature <= 2),
  system_prompt text not null default '',
  max_tokens integer not null default 4096
    check (max_tokens > 0 and max_tokens <= 128000),
  reasoning_level text not null default 'standard'
    check (reasoning_level in ('minimal', 'standard', 'deep')),
  tools_enabled jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runtime_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'PAUSED', 'TERMINATED')),
  model_provider text not null default '',
  model_name text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  reasoning text not null default '',
  output text not null default '',
  error_message text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_runtime_sessions_agent_idx on public.agent_runtime_sessions(agent_id);
create index if not exists agent_runtime_sessions_workflow_idx on public.agent_runtime_sessions(workflow_id);
create index if not exists agent_runtime_sessions_status_idx on public.agent_runtime_sessions(status);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade,
  sender_agent_id uuid references public.agents(id) on delete set null,
  receiver_agent_id uuid references public.agents(id) on delete set null,
  message text not null,
  message_type text not null default 'update'
    check (message_type in ('question', 'handoff', 'update', 'review', 'challenge', 'request')),
  created_at timestamptz not null default now()
);

create index if not exists agent_conversations_workflow_idx on public.agent_conversations(workflow_id);

create table if not exists public.orchestration_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'PAUSED')),
  current_agent_id uuid references public.agents(id) on delete set null,
  current_step_key text,
  execution_mode text not null default 'semi_autonomous'
    check (execution_mode in ('manual', 'semi_autonomous', 'autonomous')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_handoffs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade,
  from_agent_id uuid references public.agents(id) on delete set null,
  to_agent_id uuid references public.agents(id) on delete set null,
  step_key text not null,
  objective text not null default '',
  requirements text not null default '',
  deliverables text not null default '',
  decisions text not null default '',
  open_risks text not null default '',
  pending_questions text not null default '',
  approval_status text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists agent_handoffs_workflow_idx on public.agent_handoffs(workflow_id);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  agent text not null default '',
  agent_id uuid references public.agents(id) on delete set null,
  tokens_used integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  session_id uuid references public.agent_runtime_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_at_idx on public.ai_usage(created_at desc);
create index if not exists ai_usage_agent_idx on public.ai_usage(agent_id);

drop trigger if exists ai_providers_updated_at on public.ai_providers;
create trigger ai_providers_updated_at before update on public.ai_providers
  for each row execute function public.set_updated_at();

alter table public.ai_providers enable row level security;
alter table public.company_ai_settings enable row level security;
alter table public.agent_ai_config enable row level security;
alter table public.agent_runtime_sessions enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.orchestration_runs enable row level security;
alter table public.agent_handoffs enable row level security;
alter table public.ai_usage enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'ai_providers', 'company_ai_settings', 'agent_ai_config', 'agent_runtime_sessions',
    'agent_conversations', 'orchestration_runs', 'agent_handoffs', 'ai_usage'
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

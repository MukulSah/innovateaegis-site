-- Agent conversation threads + approval activation debug trails

alter table public.session_chat_messages
  add column if not exists agent_id uuid references public.agents(id) on delete set null,
  add column if not exists artifact_id uuid references public.session_artifacts(id) on delete set null,
  add column if not exists message_kind text not null default 'chat'
    check (message_kind in ('artifact', 'chat', 'system'));

-- Backfill agent turn messages as artifact posts
update public.session_chat_messages
set message_kind = 'artifact'
where speaker_type = 'agent' and step_key is not null and message_kind = 'chat';

create index if not exists session_chat_artifact_idx
  on public.session_chat_messages (artifact_id, created_at);

create index if not exists session_chat_agent_idx
  on public.session_chat_messages (agent_id, created_at);

create table if not exists public.approval_activation_trails (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.workflow_approvals(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  steps jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists approval_activation_trails_approval_idx
  on public.approval_activation_trails (approval_id, created_at desc);

alter table public.approval_activation_trails enable row level security;

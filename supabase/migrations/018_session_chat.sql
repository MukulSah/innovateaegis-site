-- Session chat: permanent project narrative (founder + agent dialogue)

create table if not exists public.session_chat_messages (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  speaker_type text not null check (speaker_type in ('founder', 'agent', 'system')),
  speaker_name text not null default '',
  speaker_role text,
  message text not null default '',
  artifact_name text,
  step_key text,
  created_at timestamptz not null default now(),
  constraint session_chat_has_context check (
    workflow_run_id is not null or objective_id is not null
  )
);

create index if not exists session_chat_workflow_idx
  on public.session_chat_messages (workflow_run_id, created_at);

create index if not exists session_chat_objective_idx
  on public.session_chat_messages (objective_id, created_at);

create index if not exists session_chat_project_idx
  on public.session_chat_messages (project_id, created_at);

alter table public.session_chat_messages enable row level security;

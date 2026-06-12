-- Phase 2.7–2.9: Single source of truth session state on workflow_runs

alter table public.workflow_runs
  add column if not exists current_artifact_id uuid references public.session_artifacts(id) on delete set null,
  add column if not exists workflow_stage text,
  add column if not exists execution_health smallint default 0,
  add column if not exists strategic_health smallint default 0;

comment on column public.workflow_runs.current_artifact_id is 'Canonical pointer to active session artifact';
comment on column public.workflow_runs.workflow_stage is 'Primary SDLC stage key (requirements, design, etc.)';
comment on column public.workflow_runs.execution_health is 'Cached execution health score 0-100';
comment on column public.workflow_runs.strategic_health is 'Cached strategic health score 0-100';

create index if not exists idx_workflow_runs_current_agent on public.workflow_runs(current_agent_id);
create index if not exists idx_workflow_runs_workflow_stage on public.workflow_runs(workflow_stage);

-- Phase 3: Founder Command Center — approval audit trail, session validation, lifecycle visibility

alter table public.workflow_runs drop constraint if exists workflow_runs_session_status_check;

alter table public.workflow_runs
  add constraint workflow_runs_session_status_check
  check (session_status in (
    'pending_ceo',
    'pending_founder',
    'pending_coo',
    'planning',
    'execution_releasing',
    'running',
    'executing',
    'waiting_approval',
    'blocked',
    'stalled',
    'recovery',
    'needs_founder_review',
    'completed',
    'failed',
    'cancelled'
  ));

alter table public.workflow_runs
  add column if not exists session_type text not null default 'planning'
    check (session_type in (
      'documentation_only',
      'planning',
      'architecture',
      'development',
      'deployment',
      'production_fix'
    ));

alter table public.workflow_runs
  add column if not exists completion_validation jsonb;

alter table public.workflow_runs
  add column if not exists delivery_outcome text;

alter table public.workflow_runs
  add column if not exists last_activity_at timestamptz;

create table if not exists public.approval_history (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid references public.workflow_approvals(id) on delete set null,
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  approval_type text not null,
  title text not null,
  requested_by text not null,
  decided_by text,
  decision text not null check (decision in (
    'requested',
    'approved',
    'rejected',
    'revision_required',
    'escalated',
    'auto_approved',
    'reopened',
    'dismissed'
  )),
  artifact_content text not null default '',
  comments text not null default '',
  requested_at timestamptz,
  decided_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists approval_history_workflow_idx on public.approval_history(workflow_id);
create index if not exists approval_history_project_idx on public.approval_history(project_id);
create index if not exists approval_history_decided_at_idx on public.approval_history(decided_at desc);

alter table public.approval_history enable row level security;

-- Backfill audit trail from existing decided approvals
insert into public.approval_history (
  approval_id, workflow_id, project_id, approval_type, title, requested_by,
  decided_by, decision, artifact_content, comments, requested_at, decided_at
)
select
  wa.id,
  wa.workflow_id,
  wa.project_id,
  wa.approval_type,
  wa.title,
  wa.requested_by,
  coalesce(wa.approved_by, 'System'),
  case wa.status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    when 'revision_required' then 'revision_required'
    when 'escalated' then 'escalated'
    when 'auto_approved' then 'auto_approved'
    else 'requested'
  end,
  coalesce(wa.artifact_content, ''),
  coalesce(wa.comments, ''),
  wa.requested_at,
  coalesce(wa.approved_at, wa.requested_at, now())
from public.workflow_approvals wa
where wa.status <> 'pending'
  and not exists (
    select 1 from public.approval_history ah
    where ah.approval_id = wa.id and ah.decision <> 'requested'
  );

-- Session truth + AI capacity status

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
    'waiting_for_ai_capacity',
    'blocked',
    'stalled',
    'recovery',
    'needs_founder_review',
    'completed',
    'failed',
    'cancelled'
  ));

comment on column public.workflow_runs.session_status is
  'Canonical session lifecycle including waiting_for_ai_capacity for free-tier queue recovery';

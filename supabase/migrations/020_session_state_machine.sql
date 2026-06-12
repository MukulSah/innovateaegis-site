-- Expand session_status state machine for COO session ownership

alter table public.workflow_runs drop constraint if exists workflow_runs_session_status_check;

alter table public.workflow_runs
  add constraint workflow_runs_session_status_check
  check (session_status in (
    'pending_ceo',
    'pending_founder',
    'pending_coo',
    'planning',
    'running',
    'executing',
    'waiting_approval',
    'blocked',
    'completed',
    'failed',
    'cancelled'
  ));

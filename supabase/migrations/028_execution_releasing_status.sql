-- P0: execution_releasing grace state between planning and executing

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
    'completed',
    'failed',
    'cancelled'
  ));

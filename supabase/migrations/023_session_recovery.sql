-- Session recovery: stalled/recovery states, activity tracking, close requests

alter table public.workflow_runs drop constraint if exists workflow_runs_session_status_check;

alter table public.workflow_runs
  add column if not exists stalled_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now();

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
    'stalled',
    'recovery',
    'completed',
    'failed',
    'cancelled'
  ));

create table if not exists public.session_close_requests (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  reason text not null default '',
  recommendation text not null default '',
  status text not null default 'pending_founder'
    check (status in ('pending_ceo', 'pending_coo', 'pending_founder', 'approved', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists session_close_requests_workflow_idx
  on public.session_close_requests(workflow_run_id, created_at desc);

alter table public.session_close_requests enable row level security;
drop policy if exists session_close_requests_select on public.session_close_requests;
create policy session_close_requests_select on public.session_close_requests
  for select using (true);

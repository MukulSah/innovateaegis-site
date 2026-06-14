-- Sprint 1: Realtime publication, RLS fixes, founder chat persistence
-- Enables live Supabase subscriptions from the browser client.

-- ---------------------------------------------------------------------------
-- RLS SELECT policies (tables had RLS enabled but no read policy)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'session_handoffs',
    'ai_retry_queue',
    'founder_chat_actions',
    'founder_chat_action_logs',
    'ai_execution_events',
    'session_finalization_events',
    'company_records',
    'session_duties',
    'session_automation_rules',
    'session_automation_runs',
    'orchestration_runs',
    'agent_runtime_sessions'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_select'
    ) then
      execute format(
        'create policy %I on public.%I for select using (true)',
        t || '_select',
        t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Founder operations chat message history
-- ---------------------------------------------------------------------------

create table if not exists public.founder_operations_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  pending_action_id uuid references public.founder_chat_actions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists founder_operations_messages_user_idx
  on public.founder_operations_messages(user_id, created_at desc);

alter table public.founder_operations_messages enable row level security;

drop policy if exists founder_operations_messages_select on public.founder_operations_messages;
create policy founder_operations_messages_select on public.founder_operations_messages
  for select using (true);

drop policy if exists founder_operations_messages_insert on public.founder_operations_messages;
create policy founder_operations_messages_insert on public.founder_operations_messages
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- Supabase Realtime publication
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'workflow_runs',
    'workflow_run_steps',
    'workflow_approvals',
    'activity_feed',
    'session_artifacts',
    'session_handoffs',
    'ai_retry_queue',
    'founder_chat_actions',
    'founder_chat_action_logs',
    'founder_operations_messages',
    'ai_execution_events',
    'company_records',
    'session_duties',
    'session_automation_rules',
    'orchestration_runs',
    'agent_runtime_sessions',
    'session_intelligence'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

-- Replica identity for tables that may not broadcast updates without it
alter table if exists public.workflow_runs replica identity full;
alter table if exists public.workflow_approvals replica identity full;
alter table if exists public.company_records replica identity full;

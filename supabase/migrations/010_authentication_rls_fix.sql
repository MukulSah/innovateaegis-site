-- Authentication: user profiles, auto-provisioning, and RLS hardening

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text not null default '',
  email text not null default '',
  role text not null default 'EMPLOYEE'
    check (role in ('FOUNDER', 'ADMIN', 'EMPLOYEE')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

create unique index if not exists user_profiles_username_idx on public.user_profiles (lower(username));
create unique index if not exists user_profiles_email_idx on public.user_profiles (lower(email));

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Audit columns on key tables
alter table public.projects
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.workflow_runs
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.tasks
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.project_objectives
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.workflow_approvals
  add column if not exists requested_by_id uuid references auth.users(id) on delete set null,
  add column if not exists approved_by_id uuid references auth.users(id) on delete set null;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  founder_count int;
  uname text;
begin
  uname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );

  select count(*) into founder_count
  from public.user_profiles
  where role = 'FOUNDER';

  insert into public.user_profiles (id, full_name, username, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), uname),
    uname,
    coalesce(new.email, ''),
    case when founder_count = 0 then 'FOUNDER' else 'EMPLOYEE' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers for RLS
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_profiles where id = auth.uid()),
    'EMPLOYEE'
  );
$$;

create or replace function public.is_authenticated_user()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.is_founder_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() = 'FOUNDER';
$$;

create or replace function public.is_admin_or_founder_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() in ('FOUNDER', 'ADMIN');
$$;

-- user_profiles RLS
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
  for select using (public.is_authenticated_user());

drop policy if exists user_profiles_insert on public.user_profiles;
create policy user_profiles_insert on public.user_profiles
  for insert with check (auth.uid() = id);

drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
  for update using (
    auth.uid() = id or public.is_founder_user()
  ) with check (
    auth.uid() = id or public.is_founder_user()
  );

-- Apply standard RLS to all application tables
do $$ declare t text;
begin
  foreach t in array array[
    'projects', 'employees', 'agents', 'agent_projects', 'agent_memory',
    'workflow_runs', 'workflow_run_steps', 'tasks',
    'project_objectives', 'project_features', 'task_history', 'project_timeline',
    'project_memory', 'project_deliverables', 'project_approvals',
    'memories', 'releases', 'activity_logs',
    'workflow_events', 'task_assignments', 'agent_groups', 'agent_group_members',
    'documents', 'decisions',
    'approval_policies', 'workflow_approvals', 'approval_comments',
    'workflow_discussions', 'company_timeline', 'agent_metrics', 'founder_overrides',
    'notifications', 'activity_feed', 'task_execution_logs', 'deliverables',
    'entity_discussions', 'reviews',
    'ai_providers', 'company_ai_settings', 'agent_ai_config',
    'agent_runtime_sessions', 'agent_conversations', 'orchestration_runs',
    'agent_handoffs', 'ai_usage'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    -- Drop legacy policies (both naming conventions)
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('drop policy if exists %I_auth_select on public.%I', t, t);
    execute format('drop policy if exists %I_auth_insert on public.%I', t, t);
    execute format('drop policy if exists %I_auth_update on public.%I', t, t);
    execute format('drop policy if exists %I_auth_delete on public.%I', t, t);

    execute format(
      'create policy %I_auth_select on public.%I for select using (public.is_authenticated_user())',
      t, t
    );
    execute format(
      'create policy %I_auth_insert on public.%I for insert with check (public.is_authenticated_user())',
      t, t
    );
    execute format(
      'create policy %I_auth_update on public.%I for update using (public.is_authenticated_user()) with check (public.is_authenticated_user())',
      t, t
    );
    execute format(
      'create policy %I_auth_delete on public.%I for delete using (public.is_admin_or_founder_user())',
      t, t
    );
  end loop;
end $$;

drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

-- Founder-only writes for sensitive configuration
drop policy if exists ai_providers_auth_insert on public.ai_providers;
drop policy if exists ai_providers_auth_update on public.ai_providers;
drop policy if exists ai_providers_auth_delete on public.ai_providers;
create policy ai_providers_founder_insert on public.ai_providers
  for insert with check (public.is_founder_user());
create policy ai_providers_founder_update on public.ai_providers
  for update using (public.is_founder_user()) with check (public.is_founder_user());
create policy ai_providers_founder_delete on public.ai_providers
  for delete using (public.is_founder_user());

drop policy if exists company_ai_settings_auth_insert on public.company_ai_settings;
drop policy if exists company_ai_settings_auth_update on public.company_ai_settings;
drop policy if exists company_ai_settings_auth_delete on public.company_ai_settings;
create policy company_ai_settings_founder_insert on public.company_ai_settings
  for insert with check (public.is_founder_user());
create policy company_ai_settings_founder_update on public.company_ai_settings
  for update using (public.is_founder_user()) with check (public.is_founder_user());
create policy company_ai_settings_founder_delete on public.company_ai_settings
  for delete using (public.is_founder_user());

drop policy if exists approval_policies_auth_insert on public.approval_policies;
drop policy if exists approval_policies_auth_update on public.approval_policies;
drop policy if exists approval_policies_auth_delete on public.approval_policies;
create policy approval_policies_founder_insert on public.approval_policies
  for insert with check (public.is_founder_user());
create policy approval_policies_founder_update on public.approval_policies
  for update using (public.is_founder_user()) with check (public.is_founder_user());
create policy approval_policies_founder_delete on public.approval_policies
  for delete using (public.is_founder_user());

drop policy if exists founder_overrides_auth_insert on public.founder_overrides;
drop policy if exists founder_overrides_auth_update on public.founder_overrides;
drop policy if exists founder_overrides_auth_delete on public.founder_overrides;
create policy founder_overrides_founder_insert on public.founder_overrides
  for insert with check (public.is_founder_user());
create policy founder_overrides_founder_update on public.founder_overrides
  for update using (public.is_founder_user()) with check (public.is_founder_user());
create policy founder_overrides_founder_delete on public.founder_overrides
  for delete using (public.is_founder_user());

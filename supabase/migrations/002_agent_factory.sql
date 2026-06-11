-- SAI Agent Factory: employees, agents, tasks, workflows, memory

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  department text not null default '',
  status text not null default 'offline'
    check (status in ('online', 'offline', 'busy')),
  current_work text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  department text not null default '',
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  tools_access jsonb not null default '[]'::jsonb,
  objectives jsonb not null default '[]'::jsonb,
  reporting_agent_id uuid references public.agents(id) on delete set null,
  priority_level text not null default 'medium'
    check (priority_level in ('low', 'medium', 'high', 'critical')),
  memory_enabled boolean not null default true,
  approval_required boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'idle', 'busy', 'disabled')),
  performance_score integer not null default 80
    check (performance_score >= 0 and performance_score <= 100),
  cloned_from_id uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_projects (
  agent_id uuid not null references public.agents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (agent_id, project_id)
);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  memory_type text not null default 'knowledge'
    check (memory_type in ('task', 'decision', 'lesson', 'knowledge', 'performance', 'project')),
  title text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  objective text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'blocked', 'paused')),
  current_step_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_key text not null,
  step_label text not null,
  step_order integer not null default 0,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'blocked', 'skipped')),
  output text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  dependencies jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'backlog'
    check (status in (
      'backlog', 'planning', 'ready', 'assigned', 'in_progress',
      'code_review', 'testing', 'approval', 'released', 'archived'
    )),
  evidence text not null default '',
  comments jsonb not null default '[]'::jsonb,
  approval_status text not null default 'none'
    check (approval_status in ('none', 'pending', 'approved', 'rejected')),
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  workflow_step_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_memory
  drop constraint if exists agent_memory_task_id_fkey;
alter table public.agent_memory
  add constraint agent_memory_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete set null;

-- updated_at triggers
drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists agents_updated_at on public.agents;
create trigger agents_updated_at before update on public.agents
  for each row execute function public.set_updated_at();

drop trigger if exists workflow_runs_updated_at on public.workflow_runs;
create trigger workflow_runs_updated_at before update on public.workflow_runs
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.employees enable row level security;
alter table public.agents enable row level security;
alter table public.agent_projects enable row level security;
alter table public.agent_memory enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;
alter table public.tasks enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'employees', 'agents', 'agent_projects', 'agent_memory',
    'workflow_runs', 'workflow_run_steps', 'tasks'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select using (true)', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (true)', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update using (true) with check (true)', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_delete on public.%I for delete using (true)', t, t);
  end loop;
end $$;

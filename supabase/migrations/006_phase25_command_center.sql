-- Phase 2.5: Workflow command center, assignments, knowledge engine

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_runs(id) on delete cascade,
  event_type text not null,
  actor text not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists workflow_events_workflow_id_idx on public.workflow_events(workflow_id);
create index if not exists workflow_events_created_at_idx on public.workflow_events(created_at desc);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  group_id uuid,
  role text not null default 'owner'
    check (role in ('owner', 'contributor', 'reviewer', 'approver')),
  assigned_at timestamptz not null default now()
);

create index if not exists task_assignments_task_id_idx on public.task_assignments(task_id);

create table if not exists public.agent_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  department text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.agent_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.agent_groups(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  unique (group_id, agent_id)
);

alter table public.task_assignments
  drop constraint if exists task_assignments_group_id_fkey;
alter table public.task_assignments
  add constraint task_assignments_group_id_fkey
  foreign key (group_id) references public.agent_groups(id) on delete cascade;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by text not null default 'SAI',
  title text not null,
  type text not null
    check (type in (
      'requirement', 'architecture', 'design', 'technical_spec',
      'implementation_guide', 'test_plan', 'release_note', 'meeting_note', 'sop'
    )),
  content text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists documents_workflow_id_idx on public.documents(workflow_id);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  decision text not null,
  rationale text not null default '',
  alternatives_considered text not null default '',
  created_by text not null default 'SAI',
  created_at timestamptz not null default now()
);

create index if not exists decisions_project_id_idx on public.decisions(project_id);
create index if not exists decisions_workflow_id_idx on public.decisions(workflow_id);

alter table public.agent_memory
  add column if not exists workflow_id uuid references public.workflow_runs(id) on delete set null,
  add column if not exists content text;

update public.agent_memory set content = summary where content is null or content = '';

alter table public.memories drop constraint if exists memories_type_check;
alter table public.memories add constraint memories_type_check
  check (type in (
    'product', 'engineering', 'decision', 'customer', 'business',
    'process', 'research', 'release', 'meeting', 'sales', 'risk',
    'security', 'operations', 'finance', 'legal', 'support',
    'incident', 'compliance', 'training'
  ));

alter table public.workflow_events enable row level security;
alter table public.task_assignments enable row level security;
alter table public.agent_groups enable row level security;
alter table public.agent_group_members enable row level security;
alter table public.documents enable row level security;
alter table public.decisions enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'workflow_events', 'task_assignments', 'agent_groups', 'agent_group_members',
    'documents', 'decisions'
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

insert into public.agent_groups (name, department, description) values
  ('Engineering Team', 'Engineering', 'Software engineers and implementers'),
  ('Architecture Team', 'Engineering', 'Solution architects and system designers'),
  ('QA Team', 'Engineering', 'Quality assurance and validation'),
  ('Operations Team', 'Operations', 'DevOps and infrastructure'),
  ('Documentation Team', 'Operations', 'Technical writing and knowledge capture')
on conflict (name) do nothing;

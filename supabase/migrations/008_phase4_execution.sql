-- Phase 4: Execution layer, inbox, agent workspaces, deliverables

alter table public.tasks
  add column if not exists progress_percentage integer not null default 0
    check (progress_percentage >= 0 and progress_percentage <= 100);

alter table public.agents
  add column if not exists capacity_status text not null default 'available'
    check (capacity_status in ('available', 'busy', 'overloaded', 'blocked', 'offline'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null
    check (recipient_type in ('founder', 'agent', 'team', 'employee')),
  recipient_id uuid,
  title text not null,
  message text not null default '',
  category text not null
    check (category in ('APPROVAL', 'ASSIGNMENT', 'COMMENT', 'ESCALATION', 'WORKFLOW', 'RELEASE', 'DOCUMENT', 'SYSTEM')),
  severity text not null default 'MEDIUM'
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_type, recipient_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_category_idx on public.notifications(category);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_feed_created_at_idx on public.activity_feed(created_at desc);
create index if not exists activity_feed_target_idx on public.activity_feed(target_type, target_id);

create table if not exists public.task_execution_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor text not null,
  action text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists task_execution_logs_task_id_idx on public.task_execution_logs(task_id);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflow_runs(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  type text not null
    check (type in (
      'PRD', 'Requirements Document', 'Architecture Document', 'API Specification',
      'Database Design', 'Implementation Guide', 'Test Plan', 'Test Report',
      'Release Notes', 'Deployment Plan', 'Meeting Summary', 'Research Report',
      'Business Proposal', 'Client Deliverable', 'Training Material', 'Knowledge Base Article'
    )),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED')),
  owner text not null default 'SAI',
  content text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists deliverables_project_id_idx on public.deliverables(project_id);
create index if not exists deliverables_status_idx on public.deliverables(status);
create index if not exists deliverables_task_id_idx on public.deliverables(task_id);

create table if not exists public.entity_discussions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('workflow', 'task', 'document', 'decision', 'deliverable', 'release', 'memory')),
  entity_id uuid not null,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists entity_discussions_entity_idx on public.entity_discussions(entity_type, entity_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  reviewer text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED')),
  comments text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reviews_entity_idx on public.reviews(entity_type, entity_id);
create index if not exists reviews_status_idx on public.reviews(status);
create index if not exists reviews_reviewer_idx on public.reviews(reviewer);

alter table public.notifications enable row level security;
alter table public.activity_feed enable row level security;
alter table public.task_execution_logs enable row level security;
alter table public.deliverables enable row level security;
alter table public.entity_discussions enable row level security;
alter table public.reviews enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'notifications', 'activity_feed', 'task_execution_logs', 'deliverables',
    'entity_discussions', 'reviews'
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

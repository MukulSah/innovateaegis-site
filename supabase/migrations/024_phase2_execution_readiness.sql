-- Phase 2: Project resource registry, Drive workspace folders, drive documents

create table if not exists public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_type text not null check (resource_type in (
    'repository', 'drive_workspace', 'database', 'server', 'domain', 'model', 'integration', 'knowledge_source'
  )),
  resource_name text not null,
  resource_identifier text not null default '',
  status text not null default 'active' check (status in ('active', 'pending', 'missing', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_resources_project_idx
  on public.project_resources(project_id, resource_type);

create table if not exists public.project_drive_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  folder_type text not null check (folder_type in (
    'root', 'requirements', 'architecture', 'sessions', 'releases', 'meetings', 'executive_reviews', 'knowledge'
  )),
  drive_folder_id text not null default '',
  drive_folder_path text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, folder_type)
);

create table if not exists public.drive_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid references public.workflow_runs(id) on delete set null,
  artifact_id uuid references public.session_artifacts(id) on delete set null,
  drive_file_id text not null default '',
  drive_url text not null default '',
  folder_type text not null default 'sessions',
  document_title text not null default '',
  version int not null default 1,
  created_by_agent uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists drive_documents_project_idx
  on public.drive_documents(project_id, created_at desc);
create index if not exists drive_documents_artifact_idx
  on public.drive_documents(artifact_id);

alter table public.project_resources enable row level security;
alter table public.project_drive_folders enable row level security;
alter table public.drive_documents enable row level security;

drop policy if exists project_resources_select on public.project_resources;
create policy project_resources_select on public.project_resources for select using (true);

drop policy if exists project_drive_folders_select on public.project_drive_folders;
create policy project_drive_folders_select on public.project_drive_folders for select using (true);

drop policy if exists drive_documents_select on public.drive_documents;
create policy drive_documents_select on public.drive_documents for select using (true);

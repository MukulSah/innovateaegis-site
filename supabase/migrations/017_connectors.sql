-- External integration accounts (GitHub, Google Drive, future sources)

create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('github', 'google_drive')),
  account_label text not null default '',
  account_identifier text not null default '',
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  integration_account_id uuid not null references public.integration_accounts(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, integration_account_id)
);

create index if not exists integration_accounts_provider_idx on public.integration_accounts(provider);
create index if not exists project_integrations_project_idx on public.project_integrations(project_id);

alter table public.integration_accounts enable row level security;
alter table public.project_integrations enable row level security;

drop policy if exists integration_accounts_select on public.integration_accounts;
drop policy if exists integration_accounts_insert on public.integration_accounts;
drop policy if exists integration_accounts_update on public.integration_accounts;
drop policy if exists integration_accounts_delete on public.integration_accounts;
create policy integration_accounts_select on public.integration_accounts for select using (true);
create policy integration_accounts_insert on public.integration_accounts for insert with check (true);
create policy integration_accounts_update on public.integration_accounts for update using (true) with check (true);
create policy integration_accounts_delete on public.integration_accounts for delete using (true);

drop policy if exists project_integrations_select on public.project_integrations;
drop policy if exists project_integrations_insert on public.project_integrations;
drop policy if exists project_integrations_update on public.project_integrations;
drop policy if exists project_integrations_delete on public.project_integrations;
create policy project_integrations_select on public.project_integrations for select using (true);
create policy project_integrations_insert on public.project_integrations for insert with check (true);
create policy project_integrations_update on public.project_integrations for update using (true) with check (true);
create policy project_integrations_delete on public.project_integrations for delete using (true);

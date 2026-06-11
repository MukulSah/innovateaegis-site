-- SAI Architecture V3: Founder Workspace, Organizational Memory, Meetings, Discussions

-- Agent Factory extensions
alter table public.agents
  add column if not exists designation text not null default '',
  add column if not exists avatar_url text,
  add column if not exists personality jsonb not null default '[]'::jsonb,
  add column if not exists accessible_brain_areas jsonb not null default '[]'::jsonb,
  add column if not exists meeting_permissions jsonb not null default '[]'::jsonb,
  add column if not exists communication_permissions jsonb not null default '[]'::jsonb,
  add column if not exists knowledge_permissions jsonb not null default '[]'::jsonb,
  add column if not exists workflow_permissions jsonb not null default '[]'::jsonb;

-- Founder Workspace personal items (NOT company brain, NOT org memory)
create table if not exists public.founder_workspace_items (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in (
    'vision', 'future_plans', 'ideas_vault', 'founder_decisions',
    'strategic_notes', 'personal_objectives', 'business_opportunities',
    'investment_notes', 'future_ventures', 'founder_preferences'
  )),
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.founder_workspace_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.founder_workspace_items(id) on delete cascade,
  version_number int not null,
  title text not null,
  content text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (item_id, version_number)
);

-- Strategic founder-agent discussions
create table if not exists public.founder_discussions (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'archived')),
  participant_agent_ids uuid[] not null default '{}',
  participant_names text[] not null default '{}',
  related_project_ids uuid[] not null default '{}',
  message_count int not null default 0,
  summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.founder_discussion_messages (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.founder_discussions(id) on delete cascade,
  author_type text not null check (author_type in ('founder', 'agent', 'system')),
  author_id uuid,
  author_name text not null default '',
  content text not null,
  message_type text not null default 'message'
    check (message_type in ('message', 'recommendation', 'risk', 'opportunity', 'argument')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists founder_discussion_messages_discussion_idx
  on public.founder_discussion_messages (discussion_id, created_at);

-- Meeting Center
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  meeting_type text not null default 'strategy'
    check (meeting_type in (
      'ceo_review', 'product_planning', 'architecture_review',
      'founder_strategy', 'board', 'team', 'custom'
    )),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  participant_agent_ids uuid[] not null default '{}',
  participant_names text[] not null default '{}',
  agenda text not null default '',
  discussion text not null default '',
  summary text,
  vision_notes text,
  notes text not null default '',
  recommendations jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  recording_url text,
  transcript text,
  related_project_id uuid references public.projects(id) on delete set null,
  related_discussion_id uuid references public.founder_discussions(id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizational Memory (living execution memory)
create table if not exists public.organizational_memory (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  content text not null default '',
  category text not null check (category in (
    'project', 'meeting', 'decision', 'research', 'business',
    'customer', 'conversation', 'knowledge', 'workflow', 'activity', 'agent'
  )),
  source text not null default 'manual'
    check (source in (
      'manual', 'meeting', 'project', 'task', 'discussion',
      'agent', 'research', 'decision', 'customer', 'document',
      'approval', 'workflow', 'activity'
    )),
  created_by text not null default 'system',
  related_agent_id uuid references public.agents(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  related_meeting_id uuid references public.meetings(id) on delete set null,
  related_discussion_id uuid references public.founder_discussions(id) on delete set null,
  related_decision_id uuid,
  visibility text not null default 'organization'
    check (visibility in ('organization', 'department', 'agent', 'founder')),
  confidence_score int check (confidence_score >= 0 and confidence_score <= 100),
  tags text[] not null default '{}',
  reference_links jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  legacy_source text,
  legacy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_memory_category_idx on public.organizational_memory (category);
create index if not exists org_memory_agent_idx on public.organizational_memory (related_agent_id);
create index if not exists org_memory_project_idx on public.organizational_memory (related_project_id);
create index if not exists org_memory_meeting_idx on public.organizational_memory (related_meeting_id);
create index if not exists org_memory_status_idx on public.organizational_memory (status);

create table if not exists public.organizational_memory_versions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.organizational_memory(id) on delete cascade,
  version_number int not null,
  title text not null,
  content text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (memory_id, version_number)
);

-- Agent-generated intelligence cards for Founder Dashboard
create table if not exists public.agent_intelligence (
  id uuid primary key default gen_random_uuid(),
  card_type text not null check (card_type in (
    'priority', 'decision', 'opportunity', 'recommendation', 'health_signal'
  )),
  raised_by_agent_id uuid references public.agents(id) on delete set null,
  raised_by_name text not null default '',
  title text not null,
  description text not null default '',
  impact text not null default 'medium'
    check (impact in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'awaiting_approval', 'approved', 'rejected', 'closed')),
  confidence int check (confidence >= 0 and confidence <= 100),
  metadata jsonb not null default '{}'::jsonb,
  related_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers
drop trigger if exists founder_workspace_items_updated_at on public.founder_workspace_items;
create trigger founder_workspace_items_updated_at before update on public.founder_workspace_items
  for each row execute function public.set_updated_at();

drop trigger if exists founder_discussions_updated_at on public.founder_discussions;
create trigger founder_discussions_updated_at before update on public.founder_discussions
  for each row execute function public.set_updated_at();

drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

drop trigger if exists organizational_memory_updated_at on public.organizational_memory;
create trigger organizational_memory_updated_at before update on public.organizational_memory
  for each row execute function public.set_updated_at();

drop trigger if exists agent_intelligence_updated_at on public.agent_intelligence;
create trigger agent_intelligence_updated_at before update on public.agent_intelligence
  for each row execute function public.set_updated_at();

-- RLS
alter table public.founder_workspace_items enable row level security;
alter table public.founder_workspace_versions enable row level security;
alter table public.founder_discussions enable row level security;
alter table public.founder_discussion_messages enable row level security;
alter table public.meetings enable row level security;
alter table public.organizational_memory enable row level security;
alter table public.organizational_memory_versions enable row level security;
alter table public.agent_intelligence enable row level security;

-- Founder-only tables
do $$ declare t text;
begin
  foreach t in array array[
    'founder_workspace_items', 'founder_workspace_versions',
    'founder_discussions', 'founder_discussion_messages'
  ] loop
    execute format('drop policy if exists %I_founder_select on public.%I', t, t);
    execute format('drop policy if exists %I_founder_insert on public.%I', t, t);
    execute format('drop policy if exists %I_founder_update on public.%I', t, t);
    execute format('drop policy if exists %I_founder_delete on public.%I', t, t);
    execute format(
      'create policy %I_founder_select on public.%I for select using (public.is_founder_user())', t, t);
    execute format(
      'create policy %I_founder_insert on public.%I for insert with check (public.is_founder_user())', t, t);
    execute format(
      'create policy %I_founder_update on public.%I for update using (public.is_founder_user()) with check (public.is_founder_user())', t, t);
    execute format(
      'create policy %I_founder_delete on public.%I for delete using (public.is_founder_user())', t, t);
  end loop;
end $$;

-- Org-wide authenticated tables
do $$ declare t text;
begin
  foreach t in array array[
    'meetings', 'organizational_memory', 'organizational_memory_versions', 'agent_intelligence'
  ] loop
    execute format('drop policy if exists %I_auth_select on public.%I', t, t);
    execute format('drop policy if exists %I_auth_insert on public.%I', t, t);
    execute format('drop policy if exists %I_auth_update on public.%I', t, t);
    execute format('drop policy if exists %I_auth_delete on public.%I', t, t);
    execute format(
      'create policy %I_auth_select on public.%I for select using (public.is_authenticated_user())', t, t);
    execute format(
      'create policy %I_auth_insert on public.%I for insert with check (public.is_authenticated_user())', t, t);
    execute format(
      'create policy %I_auth_update on public.%I for update using (public.is_authenticated_user()) with check (public.is_authenticated_user())', t, t);
    execute format(
      'create policy %I_auth_delete on public.%I for delete using (public.is_admin_or_founder_user())', t, t);
  end loop;
end $$;

-- Seed Company Brain layer categories on brain_domains (update sort groups via categories)
insert into public.brain_categories (domain_id, slug, name, description, sort_order)
select d.id, c.slug, c.name, c.description, c.sort_order
from public.brain_domains d
cross join (values
  ('mission', 'Mission', 'Company mission statement', 1),
  ('vision', 'Vision', 'Long-term company vision', 2),
  ('values', 'Values', 'Core company values', 3),
  ('policies', 'Policies', 'Company policies', 4),
  ('objectives', 'Objectives', 'Strategic objectives', 5),
  ('goals', 'Goals', 'Measurable company goals', 6),
  ('governance', 'Governance', 'Governance framework', 7)
) as c(slug, name, description, sort_order)
where d.slug = 'company'
on conflict (domain_id, slug) do nothing;

insert into public.brain_categories (domain_id, slug, name, description, sort_order)
select d.id, c.slug, c.name, c.description, c.sort_order
from public.brain_domains d
cross join (values
  ('sops', 'SOPs', 'Standard operating procedures', 1),
  ('processes', 'Processes', 'Business processes', 2),
  ('playbooks', 'Playbooks', 'Execution playbooks', 3),
  ('operational-standards', 'Operational Standards', 'Quality and ops standards', 4)
) as c(slug, name, description, sort_order)
where d.slug = 'engineering'
on conflict (domain_id, slug) do nothing;

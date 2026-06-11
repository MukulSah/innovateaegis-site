-- InnovateAegis Brain: company-wide memory and knowledge system

create extension if not exists pg_trgm;

-- Brain domains (root knowledge areas)
create table if not exists public.brain_domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default '◉',
  sort_order int not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories within domains (supports nesting)
create table if not exists public.brain_categories (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.brain_domains(id) on delete cascade,
  parent_id uuid references public.brain_categories(id) on delete set null,
  slug text not null,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, slug)
);

-- Unified memory records
create table if not exists public.memory_records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  content text not null default '',
  domain_id uuid not null references public.brain_domains(id) on delete restrict,
  category_id uuid references public.brain_categories(id) on delete set null,
  parent_id uuid references public.memory_records(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'archived', 'merged')),
  version int not null default 1,
  permission_level text not null default 'public'
    check (permission_level in ('public', 'department', 'selected_agents', 'founder_only')),
  ai_summary text,
  merged_into_id uuid references public.memory_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_records_domain_idx on public.memory_records (domain_id);
create index if not exists memory_records_category_idx on public.memory_records (category_id);
create index if not exists memory_records_parent_idx on public.memory_records (parent_id);
create index if not exists memory_records_status_idx on public.memory_records (status);
create index if not exists memory_records_title_trgm on public.memory_records using gin (title gin_trgm_ops);
create index if not exists memory_records_content_trgm on public.memory_records using gin (content gin_trgm_ops);

-- Tags
create table if not exists public.memory_tags (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.memory_records(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (record_id, tag)
);

create index if not exists memory_tags_tag_idx on public.memory_tags (tag);

-- Knowledge graph edges
create table if not exists public.memory_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.memory_records(id) on delete cascade,
  target_id uuid not null references public.memory_records(id) on delete cascade,
  relationship_type text not null default 'related_to'
    check (relationship_type in (
      'related_to', 'depends_on', 'decided_in', 'documented_in',
      'assigned_to', 'belongs_to', 'blocks', 'references'
    )),
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, target_id, relationship_type),
  check (source_id <> target_id)
);

create index if not exists memory_relationships_source_idx on public.memory_relationships (source_id);
create index if not exists memory_relationships_target_idx on public.memory_relationships (target_id);

-- Granular permissions (for selected_agents / department)
create table if not exists public.memory_permissions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.memory_records(id) on delete cascade,
  grantee_type text not null check (grantee_type in ('agent_role', 'department', 'user')),
  grantee text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  created_at timestamptz not null default now(),
  unique (record_id, grantee_type, grantee)
);

-- Version history
create table if not exists public.memory_versions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.memory_records(id) on delete cascade,
  version_number int not null,
  title text not null,
  description text not null default '',
  content text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (record_id, version_number)
);

-- Activity audit trail
create table if not exists public.memory_activities (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.memory_records(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists memory_activities_record_idx on public.memory_activities (record_id, created_at desc);

-- Vector embeddings placeholder (future semantic search)
create table if not exists public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.memory_records(id) on delete cascade unique,
  model text not null default 'pending',
  dimensions int not null default 0,
  embedding jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent memory containers (roles only — no autonomous behavior)
create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_role text not null unique,
  display_name text not null,
  description text not null default '',
  category_id uuid references public.brain_categories(id) on delete set null,
  domain_id uuid references public.brain_domains(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Founder private knowledge
create table if not exists public.founder_memories (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Retrieval analytics log
create table if not exists public.brain_retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  domains_searched text[] not null default '{}',
  records_returned int not null default 0,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Triggers
drop trigger if exists brain_domains_updated_at on public.brain_domains;
create trigger brain_domains_updated_at before update on public.brain_domains
  for each row execute function public.set_updated_at();

drop trigger if exists brain_categories_updated_at on public.brain_categories;
create trigger brain_categories_updated_at before update on public.brain_categories
  for each row execute function public.set_updated_at();

drop trigger if exists memory_records_updated_at on public.memory_records;
create trigger memory_records_updated_at before update on public.memory_records
  for each row execute function public.set_updated_at();

drop trigger if exists memory_embeddings_updated_at on public.memory_embeddings;
create trigger memory_embeddings_updated_at before update on public.memory_embeddings
  for each row execute function public.set_updated_at();

drop trigger if exists agent_memories_updated_at on public.agent_memories;
create trigger agent_memories_updated_at before update on public.agent_memories
  for each row execute function public.set_updated_at();

drop trigger if exists founder_memories_updated_at on public.founder_memories;
create trigger founder_memories_updated_at before update on public.founder_memories
  for each row execute function public.set_updated_at();

-- Seed root brain domains
insert into public.brain_domains (slug, name, description, icon, sort_order, is_system) values
  ('company', 'Company Brain', 'Company-wide knowledge, culture, and operations', '▣', 1, true),
  ('product', 'Product Brain', 'Products, features, roadmaps, and product decisions', '◈', 2, true),
  ('engineering', 'Engineering Brain', 'Architecture, systems, and technical knowledge', '⚙', 3, true),
  ('customer', 'Customer Brain', 'Customers, feedback, and success stories', '◫', 4, true),
  ('market', 'Market Brain', 'Market research, competitors, and opportunities', '◆', 5, true),
  ('decision', 'Decision Brain', 'ADRs, strategic decisions, and rationale', '⚖', 6, true),
  ('learning', 'Learning Brain', 'Lessons learned, retrospectives, and training', '◎', 7, true),
  ('ai-agent', 'AI Agent Brain', 'Agent role memory containers and agent knowledge', '◇', 8, true),
  ('founder', 'Founder Brain', 'Private founder knowledge — vision, ideas, strategy', '◉', 9, true)
on conflict (slug) do nothing;

-- Founder Brain categories
insert into public.brain_categories (domain_id, slug, name, description, sort_order)
select d.id, c.slug, c.name, c.description, c.sort_order
from public.brain_domains d
cross join (values
  ('ideas-vault', 'Ideas Vault', 'Raw ideas and sparks', 1),
  ('vision-notes', 'Vision Notes', 'Long-term vision and direction', 2),
  ('future-products', 'Future Products', 'Products not yet built', 3),
  ('founder-decisions', 'Founder Decisions', 'Strategic founder-level decisions', 4),
  ('strategic-notes', 'Strategic Notes', 'Business strategy and positioning', 5),
  ('business-opportunities', 'Business Opportunities', 'Market and partnership opportunities', 6),
  ('personal-learnings', 'Personal Learnings', 'Founder reflections and growth', 7),
  ('acquisition-ideas', 'Acquisition Ideas', 'Potential acquisitions', 8),
  ('partnership-ideas', 'Partnership Ideas', 'Strategic partnership concepts', 9)
) as c(slug, name, description, sort_order)
where d.slug = 'founder'
on conflict (domain_id, slug) do nothing;

-- AI Agent Brain role containers
insert into public.brain_categories (domain_id, slug, name, description, sort_order)
select d.id, c.slug, c.name, c.description, c.sort_order
from public.brain_domains d
cross join (values
  ('ceo', 'CEO', 'Chief Executive Officer memory space', 1),
  ('coo', 'COO', 'Chief Operating Officer memory space', 2),
  ('product-manager', 'Product Manager', 'Product management knowledge', 3),
  ('project-manager', 'Project Manager', 'Project coordination memory', 4),
  ('team-orchestrator', 'Team Orchestrator', 'Cross-team orchestration memory', 5),
  ('solution-architect', 'Solution Architect', 'Architecture and design memory', 6),
  ('software-engineer', 'Software Engineer', 'Engineering implementation memory', 7),
  ('qa-engineer', 'QA Engineer', 'Quality assurance memory', 8),
  ('devops', 'DevOps', 'Infrastructure and deployment memory', 9),
  ('documentation', 'Documentation', 'Documentation and knowledge capture', 10),
  ('sales', 'Sales', 'Sales pipeline and customer conversations', 11),
  ('marketing', 'Marketing', 'Marketing campaigns and positioning', 12),
  ('customer-success', 'Customer Success', 'Customer success and retention', 13),
  ('finance', 'Finance', 'Financial planning and metrics', 14)
) as c(slug, name, description, sort_order)
where d.slug = 'ai-agent'
on conflict (domain_id, slug) do nothing;

-- Agent memory container registry
insert into public.agent_memories (agent_role, display_name, description, category_id, domain_id)
select c.slug, c.name, c.description, cat.id, d.id
from public.brain_domains d
cross join (values
  ('ceo', 'CEO', 'Chief Executive Officer memory space'),
  ('coo', 'COO', 'Chief Operating Officer memory space'),
  ('product-manager', 'Product Manager', 'Product management knowledge'),
  ('project-manager', 'Project Manager', 'Project coordination memory'),
  ('team-orchestrator', 'Team Orchestrator', 'Cross-team orchestration memory'),
  ('solution-architect', 'Solution Architect', 'Architecture and design memory'),
  ('software-engineer', 'Software Engineer', 'Engineering implementation memory'),
  ('qa-engineer', 'QA Engineer', 'Quality assurance memory'),
  ('devops', 'DevOps', 'Infrastructure and deployment memory'),
  ('documentation', 'Documentation', 'Documentation and knowledge capture'),
  ('sales', 'Sales', 'Sales pipeline and customer conversations'),
  ('marketing', 'Marketing', 'Marketing campaigns and positioning'),
  ('customer-success', 'Customer Success', 'Customer success and retention'),
  ('finance', 'Finance', 'Financial planning and metrics')
) as c(slug, name, description)
join public.brain_categories cat on cat.domain_id = d.id and cat.slug = c.slug
where d.slug = 'ai-agent'
on conflict (agent_role) do nothing;

-- RLS
alter table public.brain_domains enable row level security;
alter table public.brain_categories enable row level security;
alter table public.memory_records enable row level security;
alter table public.memory_tags enable row level security;
alter table public.memory_relationships enable row level security;
alter table public.memory_permissions enable row level security;
alter table public.memory_versions enable row level security;
alter table public.memory_activities enable row level security;
alter table public.memory_embeddings enable row level security;
alter table public.agent_memories enable row level security;
alter table public.founder_memories enable row level security;
alter table public.brain_retrieval_logs enable row level security;

-- Standard authenticated access for brain tables
do $$ declare t text;
begin
  foreach t in array array[
    'brain_domains', 'brain_categories', 'memory_records', 'memory_tags',
    'memory_relationships', 'memory_permissions', 'memory_versions',
    'memory_activities', 'memory_embeddings', 'agent_memories',
    'brain_retrieval_logs'
  ] loop
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

-- Founder memories: founder-only access
drop policy if exists founder_memories_auth_select on public.founder_memories;
drop policy if exists founder_memories_auth_insert on public.founder_memories;
drop policy if exists founder_memories_auth_update on public.founder_memories;
drop policy if exists founder_memories_auth_delete on public.founder_memories;

create policy founder_memories_founder_select on public.founder_memories
  for select using (public.is_founder_user());
create policy founder_memories_founder_insert on public.founder_memories
  for insert with check (public.is_founder_user());
create policy founder_memories_founder_update on public.founder_memories
  for update using (public.is_founder_user()) with check (public.is_founder_user());
create policy founder_memories_founder_delete on public.founder_memories
  for delete using (public.is_founder_user());

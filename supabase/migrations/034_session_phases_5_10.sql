-- Session Architecture v2 Phases 5-10: duties, automation, tools, custom agents, scheduling

-- ---------------------------------------------------------------------------
-- Scheduled sessions
-- ---------------------------------------------------------------------------
alter table public.workflow_runs
  add column if not exists scheduled_at timestamptz,
  add column if not exists recurrence_rule text,
  add column if not exists trigger_metadata jsonb not null default '{}'::jsonb;

create index if not exists workflow_runs_scheduled_at_idx
  on public.workflow_runs(scheduled_at)
  where scheduled_at is not null;

create index if not exists workflow_runs_creation_mode_idx
  on public.workflow_runs(creation_mode);

-- ---------------------------------------------------------------------------
-- Phase 6: Duty definitions
-- ---------------------------------------------------------------------------
create table if not exists public.session_duties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  agent_role text not null default 'COO',
  agent_id uuid references public.agents(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  template_slug text not null default 'duty_session',
  cadence text not null default '0 9 * * 1',
  timezone text not null default 'UTC',
  objective_template text not null default '',
  status text not null default 'active'
    check (status in ('active', 'paused', 'pending')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_session_id uuid references public.workflow_runs(id) on delete set null,
  run_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_duties_next_run_idx
  on public.session_duties(next_run_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- Phase 7: Automation rules
-- ---------------------------------------------------------------------------
create table if not exists public.session_automation_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text not null default '',
  rule_type text not null
    check (rule_type in ('schedule', 'event', 'agent')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  project_id uuid references public.projects(id) on delete set null,
  template_slug text not null default 'founder_objective',
  status text not null default 'draft'
    check (status in ('active', 'paused', 'draft')),
  last_triggered_at timestamptz,
  trigger_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.session_automation_rules(id) on delete cascade,
  session_id uuid references public.workflow_runs(id) on delete set null,
  status text not null default 'success'
    check (status in ('success', 'skipped', 'failed')),
  message text not null default '',
  triggered_at timestamptz not null default now()
);

create index if not exists session_automation_runs_rule_idx
  on public.session_automation_runs(rule_id, triggered_at desc);

-- ---------------------------------------------------------------------------
-- Phase 9: Tool permission matrix
-- ---------------------------------------------------------------------------
create table if not exists public.tool_registry (
  id uuid primary key default gen_random_uuid(),
  tool_key text not null unique,
  label text not null,
  description text not null default '',
  category text not null default 'general',
  is_dangerous boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_tool_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  tool_key text not null references public.tool_registry(tool_key) on delete cascade,
  allowed boolean not null default true,
  scope text not null default 'global'
    check (scope in ('global', 'session', 'project')),
  created_at timestamptz not null default now(),
  unique (agent_id, tool_key, scope)
);

-- ---------------------------------------------------------------------------
-- Phase 8: Custom agent archetypes
-- ---------------------------------------------------------------------------
alter table public.agents
  add column if not exists is_custom boolean not null default false,
  add column if not exists archetype_slug text,
  add column if not exists kpi_targets jsonb not null default '{}'::jsonb;

create table if not exists public.agent_archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text not null default '',
  default_role text not null,
  default_department text not null default 'Engineering',
  default_skills text[] not null default '{}',
  default_tools text[] not null default '{}',
  default_responsibilities text[] not null default '{}',
  system_prompt text not null default '',
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.session_duties enable row level security;
alter table public.session_automation_rules enable row level security;
alter table public.session_automation_runs enable row level security;
alter table public.tool_registry enable row level security;
alter table public.agent_tool_permissions enable row level security;
alter table public.agent_archetypes enable row level security;

drop policy if exists session_duties_all on public.session_duties;
create policy session_duties_all on public.session_duties for all using (true) with check (true);

drop policy if exists session_automation_rules_all on public.session_automation_rules;
create policy session_automation_rules_all on public.session_automation_rules for all using (true) with check (true);

drop policy if exists session_automation_runs_all on public.session_automation_runs;
create policy session_automation_runs_all on public.session_automation_runs for all using (true) with check (true);

drop policy if exists tool_registry_all on public.tool_registry;
create policy tool_registry_all on public.tool_registry for all using (true) with check (true);

drop policy if exists agent_tool_permissions_all on public.agent_tool_permissions;
create policy agent_tool_permissions_all on public.agent_tool_permissions for all using (true) with check (true);

drop policy if exists agent_archetypes_all on public.agent_archetypes;
create policy agent_archetypes_all on public.agent_archetypes for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed tool registry
-- ---------------------------------------------------------------------------
insert into public.tool_registry (tool_key, label, description, category, is_dangerous) values
  ('code_write', 'Code Generation', 'Generate and modify code', 'engineering', false),
  ('terminal', 'Terminal', 'Execute shell commands', 'engineering', true),
  ('repository', 'Repository', 'Read and write repository files', 'engineering', false),
  ('supabase', 'Supabase', 'Database and auth operations', 'engineering', true),
  ('database_design', 'Database Design', 'Schema and migration design', 'architecture', false),
  ('system_design', 'System Design', 'Architecture and system diagrams', 'architecture', false),
  ('documentation', 'Documentation', 'Create and edit documentation', 'operations', false),
  ('analytics', 'Analytics', 'Read company analytics', 'executive', false),
  ('reporting', 'Reporting', 'Generate executive reports', 'executive', false),
  ('portfolio_intelligence', 'Portfolio Intelligence', 'Product portfolio analysis', 'executive', false),
  ('approvals', 'Approvals', 'Request and process approvals', 'governance', false),
  ('brain_read', 'Brain Read', 'Read organizational memory', 'knowledge', false),
  ('brain_write', 'Brain Write', 'Write to organizational memory', 'knowledge', false),
  ('deploy', 'Deploy', 'Trigger deployments', 'engineering', true),
  ('customer_data', 'Customer Data', 'Access customer records', 'sales', true)
on conflict (tool_key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed agent archetypes
-- ---------------------------------------------------------------------------
insert into public.agent_archetypes (slug, label, description, default_role, default_department, default_skills, default_tools, default_responsibilities, system_prompt) values
  ('growth_strategist', 'Growth Strategist', 'Identifies growth opportunities and strategic initiatives.', 'CEO', 'Executive', array['strategy','analytics','market analysis'], array['analytics','reporting','portfolio_intelligence'], array['Weekly growth review','Opportunity discovery'], 'You are a Growth Strategist focused on company growth, market opportunities, and strategic recommendations.'),
  ('seo_specialist', 'SEO Specialist', 'Search optimization and content strategy.', 'Marketing', 'Marketing', array['seo','content','analytics'], array['analytics','documentation','brain_read'], array['SEO audits','Content optimization'], 'You are an SEO Specialist focused on search visibility and content performance.'),
  ('finance_analyst', 'Finance Analyst', 'Financial analysis and reporting.', 'Finance', 'Operations', array['finance','reporting','forecasting'], array['analytics','reporting'], array['Monthly financial review','Budget analysis'], 'You are a Finance Analyst focused on company financial health and forecasts.'),
  ('customer_success', 'Customer Success', 'Customer engagement and support escalation.', 'Customer Success', 'Sales', array['support','communication'], array['customer_data','documentation','brain_read'], array['Customer feedback review','Escalation handling'], 'You are a Customer Success agent focused on customer satisfaction and retention.'),
  ('research_analyst', 'Research Analyst', 'Market and technical research.', 'Research', 'Product', array['research','analysis'], array['brain_read','documentation','analytics'], array['Competitive research','Technical research'], 'You are a Research Analyst focused on gathering and synthesizing research findings.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed duties (from spec)
-- ---------------------------------------------------------------------------
insert into public.session_duties (title, description, agent_role, template_slug, cadence, objective_template, status, next_run_at) values
  ('Weekly Growth Review', 'CEO weekly growth and opportunity review', 'CEO', 'growth_review', '0 9 * * 1', 'Weekly CEO Growth Review — analyze growth metrics and identify opportunities', 'active', now() + interval '1 day'),
  ('Daily Operations Review', 'COO daily operations and delivery audit', 'COO', 'operations_review', '0 8 * * *', 'Daily Operations Review — assess delivery status, blockers, and capacity', 'active', now() + interval '12 hours'),
  ('Weekly Delivery Audit', 'COO weekly delivery audit', 'COO', 'operations_review', '0 9 * * 5', 'Weekly Delivery Audit — review session throughput and completion rates', 'active', now() + interval '2 days'),
  ('Backlog Review', 'Product Manager backlog review', 'Product Manager', 'product_development', '0 10 * * 1', 'Weekly Backlog Review — prioritize features and customer requests', 'active', now() + interval '1 day'),
  ('Customer Feedback Review', 'Review customer feedback and support trends', 'Product Manager', 'product_development', '0 10 * * 3', 'Customer Feedback Review — synthesize feedback into actionable items', 'active', now() + interval '3 days')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed automation rules
-- ---------------------------------------------------------------------------
insert into public.session_automation_rules (label, description, rule_type, trigger_config, action_config, template_slug, status) values
  (
    'CEO Weekly Review',
    'Create CEO Growth Review session every Monday 9 AM',
    'schedule',
    '{"cron":"0 9 * * 1","timezone":"UTC"}'::jsonb,
    '{"objectiveTemplate":"Weekly CEO Growth Review","dutyTitle":"CEO Weekly Review"}'::jsonb,
    'growth_review',
    'active'
  ),
  (
    'Daily Operations Review',
    'Create COO Operations Review session daily at 8 AM',
    'schedule',
    '{"cron":"0 8 * * *","timezone":"UTC"}'::jsonb,
    '{"objectiveTemplate":"Daily Operations Review"}'::jsonb,
    'operations_review',
    'active'
  ),
  (
    'Critical Incident Response',
    'Generate incident response session when critical incident event fires',
    'event',
    '{"eventType":"critical_incident"}'::jsonb,
    '{"objectiveTemplate":"Critical Incident Response — {{incidentTitle}}"}'::jsonb,
    'incident_response',
    'active'
  ),
  (
    'Project Delay Escalation',
    'Generate risk review when project delayed more than 3 days',
    'event',
    '{"eventType":"project_delayed","thresholdDays":3}'::jsonb,
    '{"objectiveTemplate":"Risk Review — project delayed {{projectName}}"}'::jsonb,
    'operations_review',
    'draft'
  ),
  (
    'Growth Opportunity Detection',
    'CEO agent identifies growth opportunity and creates session',
    'agent',
    '{"agentRole":"CEO","signal":"growth_opportunity"}'::jsonb,
    '{"objectiveTemplate":"Growth Opportunity — {{opportunityTitle}}"}'::jsonb,
    'growth_review',
    'active'
  )
on conflict do nothing;

-- Automation session template seed
insert into public.session_templates (slug, label, description, session_type, default_priority, ownership_defaults)
values (
  'automation_session',
  'Automation Session',
  'Session created automatically by an automation rule.',
  'automation',
  'medium',
  '{"ownerRole":"COO","approverRole":"Founder"}'::jsonb
)
on conflict (slug) do nothing;

insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, 'execution', 'Automated Execution', 1, 'COO', 'implementation', 'implementation'
from public.session_templates t where t.slug = 'automation_session'
on conflict (template_id, stage_key) do nothing;

-- Incident response stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.deliverable_type
from public.session_templates t
cross join (values
  ('triage', 'Incident Triage', 1, 'COO', 'requirements', 'incident_report'),
  ('mitigation', 'Mitigation', 2, 'Engineer', 'implementation', 'fix'),
  ('deployment', 'Deployment', 3, 'DevOps', 'deployment', 'deployment'),
  ('postmortem', 'Post-Mortem', 4, 'Documentation', 'knowledge', 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
where t.slug = 'incident_response'
on conflict (template_id, stage_key) do nothing;

-- Operations review stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.deliverable_type
from public.session_templates t
cross join (values
  ('ops_review', 'Operations Review', 1, 'COO', 'coo_execution', 'execution_plan'),
  ('capacity', 'Capacity Assessment', 2, 'COO', 'requirements', 'readiness_report'),
  ('knowledge_capture', 'Knowledge Capture', 3, 'Documentation', 'knowledge', 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
where t.slug = 'operations_review'
on conflict (template_id, stage_key) do nothing;

-- Duty session stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.deliverable_type
from public.session_templates t
cross join (values
  ('duty_execution', 'Duty Execution', 1, 'COO', 'implementation', 'implementation'),
  ('duty_report', 'Duty Report', 2, 'Documentation', 'knowledge', 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
where t.slug = 'duty_session'
on conflict (template_id, stage_key) do nothing;

-- Session Architecture v2: templates, types, ownership, dependencies, intelligence, records

-- ---------------------------------------------------------------------------
-- Session type system (expanded)
-- ---------------------------------------------------------------------------
alter table public.workflow_runs drop constraint if exists workflow_runs_session_type_check;

alter table public.workflow_runs
  add constraint workflow_runs_session_type_check
  check (session_type in (
    -- v2 canonical types
    'founder_objective',
    'product_development',
    'bug_fix',
    'incident',
    'research',
    'sales',
    'marketing',
    'operations',
    'duty',
    'automation',
    'customer_request',
    -- legacy (backward compatible)
    'documentation_only',
    'planning',
    'architecture',
    'development',
    'deployment',
    'production_fix'
  ));

-- ---------------------------------------------------------------------------
-- Session templates
-- ---------------------------------------------------------------------------
create table if not exists public.session_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text not null default '',
  session_type text not null,
  version int not null default 1,
  is_system boolean not null default true,
  is_active boolean not null default true,
  default_priority text not null default 'medium'
    check (default_priority in ('low', 'medium', 'high', 'critical')),
  ownership_defaults jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_template_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.session_templates(id) on delete cascade,
  stage_key text not null,
  label text not null,
  stage_order int not null default 0,
  agent_role text not null default '',
  sdlc_step_key text,
  required boolean not null default true,
  governance_approval text,
  deliverable_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, stage_key)
);

create index if not exists session_template_stages_template_order_idx
  on public.session_template_stages(template_id, stage_order);

-- Link sessions to templates
alter table public.workflow_runs
  add column if not exists session_template_id uuid references public.session_templates(id) on delete set null,
  add column if not exists creation_mode text not null default 'instant'
    check (creation_mode in ('instant', 'scheduled', 'recurring', 'triggered', 'duty', 'automation')),
  add column if not exists sponsor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approver_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approver_agent_id uuid references public.agents(id) on delete set null;

create index if not exists workflow_runs_session_template_idx
  on public.workflow_runs(session_template_id);
create index if not exists workflow_runs_session_type_idx
  on public.workflow_runs(session_type);

comment on column public.workflow_runs.executive_sponsor_agent_id is 'Session sponsor agent (typically CEO)';
comment on column public.workflow_runs.session_owner_agent_id is 'Session owner agent (typically COO)';
comment on column public.workflow_runs.current_agent_id is 'Current executor agent';
comment on column public.workflow_runs.sponsor_user_id is 'Human sponsor (typically Founder)';
comment on column public.workflow_runs.approver_user_id is 'Human approver (typically Founder)';

-- ---------------------------------------------------------------------------
-- Session dependencies
-- ---------------------------------------------------------------------------
create table if not exists public.session_dependencies (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workflow_runs(id) on delete cascade,
  depends_on_session_id uuid not null references public.workflow_runs(id) on delete cascade,
  dependency_type text not null default 'depends_on'
    check (dependency_type in ('blocks', 'depends_on', 'related')),
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (session_id <> depends_on_session_id),
  unique (session_id, depends_on_session_id, dependency_type)
);

create index if not exists session_dependencies_session_idx
  on public.session_dependencies(session_id);
create index if not exists session_dependencies_depends_on_idx
  on public.session_dependencies(depends_on_session_id);

-- ---------------------------------------------------------------------------
-- Session intelligence (mandatory knowledge capture on completion)
-- ---------------------------------------------------------------------------
create table if not exists public.session_intelligence (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null unique references public.workflow_runs(id) on delete cascade,
  outcome_summary text not null default '',
  lessons_learned jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  wins jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  reusable_knowledge jsonb not null default '[]'::jsonb,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'in_progress', 'complete', 'failed')),
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_intelligence_status_idx
  on public.session_intelligence(extraction_status);

-- ---------------------------------------------------------------------------
-- Company records (Records Center / Company Brain foundation)
-- ---------------------------------------------------------------------------
create table if not exists public.company_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null
    check (record_type in (
      'session_file', 'decision', 'knowledge', 'architecture',
      'sop', 'agent_learning', 'lesson', 'recommendation'
    )),
  title text not null,
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  source_session_id uuid references public.workflow_runs(id) on delete set null,
  source_project_id uuid references public.projects(id) on delete set null,
  source_agent_id uuid references public.agents(id) on delete set null,
  tags text[] not null default '{}',
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_records_type_idx on public.company_records(record_type);
create index if not exists company_records_session_idx on public.company_records(source_session_id);
create index if not exists company_records_search_idx on public.company_records using gin(to_tsvector('english', search_text));

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.session_templates enable row level security;
alter table public.session_template_stages enable row level security;
alter table public.session_dependencies enable row level security;
alter table public.session_intelligence enable row level security;
alter table public.company_records enable row level security;

drop policy if exists session_templates_select on public.session_templates;
drop policy if exists session_templates_insert on public.session_templates;
drop policy if exists session_templates_update on public.session_templates;
create policy session_templates_select on public.session_templates for select using (true);
create policy session_templates_insert on public.session_templates for insert with check (true);
create policy session_templates_update on public.session_templates for update using (true) with check (true);

drop policy if exists session_template_stages_select on public.session_template_stages;
drop policy if exists session_template_stages_insert on public.session_template_stages;
create policy session_template_stages_select on public.session_template_stages for select using (true);
create policy session_template_stages_insert on public.session_template_stages for insert with check (true);

drop policy if exists session_dependencies_select on public.session_dependencies;
drop policy if exists session_dependencies_insert on public.session_dependencies;
drop policy if exists session_dependencies_delete on public.session_dependencies;
create policy session_dependencies_select on public.session_dependencies for select using (true);
create policy session_dependencies_insert on public.session_dependencies for insert with check (true);
create policy session_dependencies_delete on public.session_dependencies for delete using (true);

drop policy if exists session_intelligence_select on public.session_intelligence;
drop policy if exists session_intelligence_insert on public.session_intelligence;
drop policy if exists session_intelligence_update on public.session_intelligence;
create policy session_intelligence_select on public.session_intelligence for select using (true);
create policy session_intelligence_insert on public.session_intelligence for insert with check (true);
create policy session_intelligence_update on public.session_intelligence for update using (true) with check (true);

drop policy if exists company_records_select on public.company_records;
drop policy if exists company_records_insert on public.company_records;
drop policy if exists company_records_update on public.company_records;
create policy company_records_select on public.company_records for select using (true);
create policy company_records_insert on public.company_records for insert with check (true);
create policy company_records_update on public.company_records for update using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed system templates
-- ---------------------------------------------------------------------------
insert into public.session_templates (slug, label, description, session_type, default_priority, ownership_defaults)
values
  (
    'founder_objective',
    'Founder Objective',
    'Strategic directive from the founder — CEO validates, COO plans, agents execute.',
    'founder_objective',
    'high',
    '{"sponsorRole":"Founder","ownerRole":"COO","sponsorAgentRole":"CEO","approverRole":"Founder"}'::jsonb
  ),
  (
    'product_development',
    'Product Development',
    'Feature or product initiative from concept through delivery and knowledge capture.',
    'product_development',
    'medium',
    '{"sponsorAgentRole":"CEO","ownerRole":"COO","executorRole":"Engineer","approverRole":"Founder"}'::jsonb
  ),
  (
    'bug_fix',
    'Bug Fix',
    'Production or development defect remediation with root cause and validation.',
    'bug_fix',
    'high',
    '{"ownerRole":"COO","executorRole":"Engineer","approverRole":"Founder"}'::jsonb
  ),
  (
    'incident_response',
    'Incident Response',
    'Critical incident triage, mitigation, deployment, and post-mortem.',
    'incident',
    'critical',
    '{"ownerRole":"COO","executorRole":"Engineer","approverRole":"Founder"}'::jsonb
  ),
  (
    'growth_review',
    'Growth Review',
    'Strategic growth analysis, opportunity discovery, and execution recommendation.',
    'founder_objective',
    'high',
    '{"sponsorAgentRole":"CEO","ownerRole":"COO","approverRole":"Founder"}'::jsonb
  ),
  (
    'research',
    'Research',
    'Market, technical, or competitive research initiative.',
    'research',
    'low',
    '{"sponsorAgentRole":"CEO","ownerRole":"COO","approverRole":"Founder"}'::jsonb
  ),
  (
    'operations_review',
    'Operations Review',
    'Operational audit, capacity review, or process improvement.',
    'operations',
    'medium',
    '{"ownerRole":"COO","approverRole":"Founder"}'::jsonb
  ),
  (
    'duty_session',
    'Duty Session',
    'Recurring agent duty — auto-generated organizational responsibility.',
    'duty',
    'medium',
    '{"ownerRole":"COO","approverRole":"Founder"}'::jsonb
  )
on conflict (slug) do nothing;

-- Product Development stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.governance_approval, s.deliverable_type
from public.session_templates t
cross join (values
  ('ceo_review', 'CEO Review', 1, 'CEO', 'ceo_strategy', null, 'strategic_brief'),
  ('coo_planning', 'COO Planning', 2, 'COO', 'coo_execution', null, 'execution_plan'),
  ('requirements', 'Product Requirements', 3, 'Product Manager', 'requirements', 'requirements', 'prd'),
  ('architecture', 'Architecture', 4, 'Architect', 'design', 'architecture', 'architecture'),
  ('planning', 'Project Planning', 5, 'Project Manager', 'tasks', 'task_plan', 'task_breakdown'),
  ('development', 'Development', 6, 'Engineer', 'implementation', null, 'implementation'),
  ('qa', 'QA', 7, 'QA', 'validation', null, 'test_plan'),
  ('deployment', 'Deployment', 8, 'DevOps', 'deployment', 'release', 'deployment'),
  ('documentation', 'Documentation', 9, 'Documentation', 'documentation', null, 'documentation'),
  ('knowledge_capture', 'Knowledge Capture', 10, 'Documentation', 'knowledge', null, 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
where t.slug = 'product_development'
on conflict (template_id, stage_key) do nothing;

-- Bug Fix stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.deliverable_type
from public.session_templates t
cross join (values
  ('incident_analysis', 'Incident Analysis', 1, 'Engineer', 'requirements', 'incident_report'),
  ('root_cause', 'Root Cause', 2, 'Engineer', 'design', 'root_cause_analysis'),
  ('fix', 'Fix', 3, 'Engineer', 'implementation', 'fix'),
  ('validation', 'Validation', 4, 'QA', 'validation', 'test_plan'),
  ('deployment', 'Deployment', 5, 'DevOps', 'deployment', 'deployment'),
  ('lessons_learned', 'Lessons Learned', 6, 'Documentation', 'knowledge', 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
where t.slug = 'bug_fix'
on conflict (template_id, stage_key) do nothing;

-- Growth Review stages
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.deliverable_type
from public.session_templates t
cross join (values
  ('analysis', 'Analysis', 1, 'CEO', 'ceo_strategy', 'strategic_brief'),
  ('opportunity', 'Opportunity Discovery', 2, 'CEO', 'requirements', 'opportunity_report'),
  ('recommendation', 'Recommendation', 3, 'CEO', 'design', 'recommendation'),
  ('approval', 'Approval', 4, 'Founder', null, 'approval'),
  ('execution', 'Execution', 5, 'COO', 'implementation', 'execution_plan')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, deliverable_type)
where t.slug = 'growth_review'
on conflict (template_id, stage_key) do nothing;

-- Founder Objective stages (full SDLC chain)
insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, s.stage_key, s.label, s.stage_order, s.agent_role, s.sdlc_step_key, s.governance_approval, s.deliverable_type
from public.session_templates t
cross join (values
  ('ceo_review', 'CEO Review', 1, 'CEO', 'ceo_strategy', null, 'strategic_brief'),
  ('coo_planning', 'COO Planning', 2, 'COO', 'coo_execution', null, 'execution_plan'),
  ('requirements', 'Product Requirements', 3, 'Product Manager', 'requirements', 'requirements', 'prd'),
  ('architecture', 'Architecture', 4, 'Architect', 'design', 'architecture', 'architecture'),
  ('planning', 'Project Planning', 5, 'Project Manager', 'tasks', 'task_plan', 'task_breakdown'),
  ('development', 'Development', 6, 'Engineer', 'implementation', null, 'implementation'),
  ('qa', 'QA', 7, 'QA', 'validation', null, 'test_plan'),
  ('deployment', 'Deployment', 8, 'DevOps', 'deployment', 'release', 'deployment'),
  ('documentation', 'Documentation', 9, 'Documentation', 'documentation', null, 'documentation'),
  ('knowledge_capture', 'Knowledge Capture', 10, 'Documentation', 'knowledge', null, 'knowledge')
) as s(stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
where t.slug = 'founder_objective'
on conflict (template_id, stage_key) do nothing;

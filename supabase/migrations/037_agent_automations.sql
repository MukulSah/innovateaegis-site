-- Agent automations: Cursor-style user-defined automations (BugBot, Security, Approval)

-- ---------------------------------------------------------------------------
-- Company automation settings (org-wide BugBot defaults)
-- ---------------------------------------------------------------------------
create table if not exists public.company_automation_settings (
  id uuid primary key default gen_random_uuid(),
  bugbot_enabled boolean not null default true,
  bugbot_defaults jsonb not null default '{
    "triggerMode": "every_push",
    "reviewDraftPrs": false,
    "prSummaries": true,
    "autofixMode": "off",
    "autofixSeverityThreshold": ["low", "medium", "high"],
    "incrementalReview": false
  }'::jsonb,
  repository_rules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.company_automation_settings (bugbot_enabled)
select true where not exists (select 1 from public.company_automation_settings);

alter table public.company_automation_settings enable row level security;
drop policy if exists company_automation_settings_all on public.company_automation_settings;
create policy company_automation_settings_all on public.company_automation_settings
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Agent automations
-- ---------------------------------------------------------------------------
create table if not exists public.agent_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('active', 'paused', 'draft')),
  automation_kind text not null default 'custom'
    check (automation_kind in ('bugbot', 'security', 'approval', 'custom')),
  instructions text not null default '',
  model_selection text not null default 'auto',
  memory_enabled boolean not null default true,
  triggers jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  repository_scope jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  template_slug text not null default 'bugbot_review',
  project_id uuid references public.projects(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  timezone text not null default 'UTC',
  next_run_at timestamptz,
  last_run_at timestamptz,
  run_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_automations_status_idx on public.agent_automations(status);
create index if not exists agent_automations_kind_idx on public.agent_automations(automation_kind);
create index if not exists agent_automations_next_run_idx on public.agent_automations(next_run_at)
  where status = 'active';

create table if not exists public.agent_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.agent_automations(id) on delete cascade,
  session_id uuid references public.workflow_runs(id) on delete set null,
  trigger_type text not null default 'manual',
  status text not null default 'success'
    check (status in ('success', 'skipped', 'failed')),
  message text not null default '',
  metrics jsonb not null default '{}'::jsonb,
  triggered_at timestamptz not null default now()
);

create index if not exists agent_automation_runs_automation_idx
  on public.agent_automation_runs(automation_id, triggered_at desc);

alter table public.agent_automations enable row level security;
alter table public.agent_automation_runs enable row level security;

drop policy if exists agent_automations_all on public.agent_automations;
create policy agent_automations_all on public.agent_automations for all using (true) with check (true);

drop policy if exists agent_automation_runs_all on public.agent_automation_runs;
create policy agent_automation_runs_all on public.agent_automation_runs for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Minimal session templates for agent automations
-- ---------------------------------------------------------------------------
insert into public.session_templates (slug, label, description, session_type, default_priority, ownership_defaults, metadata)
values
  (
    'bugbot_review',
    'BugBot Review',
    'Single-step PR bug review automation.',
    'automation',
    'medium',
    '{"ownerRole":"COO","executorRole":"QA","approverRole":"Founder"}'::jsonb,
    '{"automationKind":"bugbot"}'::jsonb
  ),
  (
    'security_scan',
    'Security Scan',
    'Single-step security vulnerability scan.',
    'automation',
    'high',
    '{"ownerRole":"COO","executorRole":"Security","approverRole":"Founder"}'::jsonb,
    '{"automationKind":"security"}'::jsonb
  ),
  (
    'approval_triage',
    'Approval Triage',
    'Governance and PR approval triage.',
    'automation',
    'medium',
    '{"ownerRole":"COO","sponsorAgentRole":"COO","approverRole":"Founder"}'::jsonb,
    '{"automationKind":"approval"}'::jsonb
  )
on conflict (slug) do nothing;

insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, 'bugbot_review', 'BugBot PR Review', 1, 'QA', 'validation', null, 'code_review_report'
from public.session_templates t where t.slug = 'bugbot_review'
on conflict (template_id, stage_key) do nothing;

insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, 'security_scan', 'Security Scan', 1, 'Security', 'validation', 'security', 'security_audit'
from public.session_templates t where t.slug = 'security_scan'
on conflict (template_id, stage_key) do nothing;

insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, 'approval_governance', 'Governance Triage', 1, 'COO', 'coo_execution', null, 'approval_triage_report'
from public.session_templates t where t.slug = 'approval_triage'
on conflict (template_id, stage_key) do nothing;

insert into public.session_template_stages (template_id, stage_key, label, stage_order, agent_role, sdlc_step_key, governance_approval, deliverable_type)
select t.id, 'approval_pr', 'PR Approval', 2, 'QA', 'validation', null, 'pr_approval_report'
from public.session_templates t where t.slug = 'approval_triage'
on conflict (template_id, stage_key) do nothing;

-- ---------------------------------------------------------------------------
-- Agent archetypes for automation agents
-- ---------------------------------------------------------------------------
insert into public.agent_archetypes (slug, label, description, default_role, default_department, default_skills, default_tools, default_responsibilities, system_prompt) values
  (
    'bugbot_reviewer',
    'BugBot Reviewer',
    'Automatically reviews pull requests for bugs and issues.',
    'QA',
    'Engineering',
    array['code review','debugging','static analysis'],
    array['repository','brain_read','documentation'],
    array['PR bug review','Incremental diff review','Post review summaries'],
    'You are BugBot. Review code changes for bugs, logic errors, edge cases, and regressions. Output findings as a markdown table with Severity, Location (file:line), and Finding columns sorted by severity. Be precise and actionable.'
  ),
  (
    'security_analyst',
    'Security Analyst',
    'Scans codebases for security vulnerabilities and compliance issues.',
    'Security',
    'Engineering',
    array['security','vulnerability assessment','compliance'],
    array['repository','brain_read','documentation'],
    array['Vulnerability scanning','Security audit reports','Critical finding escalation'],
    'You are a Security Analyst agent. Review code for security vulnerabilities including injection, auth flaws, secrets exposure, and insecure dependencies. Output findings sorted by severity with remediation guidance.'
  ),
  (
    'approval_agent',
    'Approval Agent',
    'Triages governance approvals and PR review readiness.',
    'COO',
    'Executive',
    array['governance','code review','operations'],
    array['approvals','repository','brain_read'],
    array['Governance queue triage','PR reviewer requests','Approval recommendations'],
    'You are an Approval Agent. Triage pending governance approvals and open pull requests. Recommend approve/reject/escalate decisions with clear rationale. For PRs, assess review readiness and suggest reviewers.'
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed default automations (draft until user enables)
-- ---------------------------------------------------------------------------
insert into public.agent_automations (
  name, description, status, automation_kind, instructions, template_slug,
  triggers, preferences, repository_scope, tools
) values
  (
    'Find bugs',
    'Automatically review pull requests for bugs and issues.',
    'draft',
    'bugbot',
    'Review the PR diff for bugs, logic errors, and regressions. Post a concise summary and detailed findings table.',
    'bugbot_review',
    '[{"type":"git","event":"pr_pushed","repos":[]}]'::jsonb,
    '{"triggerMode":"every_push","reviewDraftPrs":false,"prSummaries":true,"incrementalReview":false}'::jsonb,
    '{"provider":"github","repos":[]}'::jsonb,
    '[{"type":"internal","key":"repository"},{"type":"internal","key":"brain_read"}]'::jsonb
  ),
  (
    'Scan codebase for vulnerabilities',
    'Review the full repository on a schedule and alert on validated high-impact security issues.',
    'draft',
    'security',
    'Scan the connected repository for security vulnerabilities. Report validated high-impact issues with remediation steps.',
    'security_scan',
    '[{"type":"cron","cron":"0 9 * * *","preset":"daily","timezone":"UTC"}]'::jsonb,
    '{}'::jsonb,
    '{"provider":"github","repos":[]}'::jsonb,
    '[{"type":"internal","key":"repository"},{"type":"internal","key":"brain_read"}]'::jsonb
  ),
  (
    'Approval triage',
    'Triage governance approvals and PR review readiness on a schedule.',
    'draft',
    'approval',
    'Process pending governance approvals where COO can auto-approve. Review open PRs and request reviewers where needed.',
    'approval_triage',
    '[{"type":"cron","cron":"0 * * * *","preset":"hourly","timezone":"UTC"}]'::jsonb,
    '{}'::jsonb,
    '{"provider":"github","repos":[]}'::jsonb,
'[{"type":"internal","key":"approvals"},{"type":"internal","key":"repository"}]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

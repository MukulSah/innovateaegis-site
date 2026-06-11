-- Agent Intelligence Engine: standardized intelligence records

alter table public.agent_intelligence
  add column if not exists summary text not null default '',
  add column if not exists reasoning text not null default '',
  add column if not exists recommendation_text text not null default '',
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  add column if not exists related_project_ids uuid[] not null default '{}',
  add column if not exists related_decision_ids uuid[] not null default '{}',
  add column if not exists related_meeting_ids uuid[] not null default '{}',
  add column if not exists related_memory_ids uuid[] not null default '{}',
  add column if not exists expires_at timestamptz;

update public.agent_intelligence
set summary = description
where summary = '' and description <> '';

alter table public.agent_intelligence
  rename column card_type to intelligence_type;

update public.agent_intelligence set intelligence_type = 'current_priority' where intelligence_type = 'priority';
update public.agent_intelligence set intelligence_type = 'pending_decision' where intelligence_type = 'decision';
update public.agent_intelligence set intelligence_type = 'strategic_opportunity' where intelligence_type = 'opportunity';
update public.agent_intelligence set intelligence_type = 'executive_recommendation' where intelligence_type = 'recommendation';

alter table public.agent_intelligence drop constraint if exists agent_intelligence_card_type_check;

alter table public.agent_intelligence
  add constraint agent_intelligence_type_check check (
    intelligence_type in (
      'current_priority',
      'pending_decision',
      'strategic_opportunity',
      'executive_recommendation',
      'risk_alert',
      'project_alert',
      'operational_alert',
      'customer_insight',
      'market_insight',
      'innovation_opportunity',
      'health_signal',
      'escalation',
      'executive_briefing'
    )
  );

alter table public.agent_intelligence drop constraint if exists agent_intelligence_status_check;

alter table public.agent_intelligence
  add constraint agent_intelligence_status_check check (
    status in (
      'open', 'in_progress', 'awaiting_approval',
      'approved', 'rejected', 'closed', 'archived', 'expired'
    )
  );

create index if not exists agent_intelligence_type_status_idx
  on public.agent_intelligence (intelligence_type, status);

create index if not exists agent_intelligence_agent_active_idx
  on public.agent_intelligence (raised_by_agent_id, status)
  where status in ('open', 'in_progress', 'awaiting_approval');

create index if not exists agent_intelligence_expires_idx
  on public.agent_intelligence (expires_at)
  where expires_at is not null and status = 'open';

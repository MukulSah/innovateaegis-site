-- Root agents report directly to Owner (reporting_agent_id = NULL)

alter table public.agents
  alter column reporting_agent_id drop not null;

comment on column public.agents.reporting_agent_id is
  'NULL = reports directly to company Owner (not stored in agents table)';

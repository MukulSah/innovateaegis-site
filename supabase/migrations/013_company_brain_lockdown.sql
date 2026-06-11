-- Company Brain lockdown: layer-based structure (constitutional knowledge system)

alter table public.brain_domains
  add column if not exists is_locked boolean not null default false,
  add column if not exists layer_purpose text not null default '';

alter table public.brain_categories
  add column if not exists custodian_agent_role text not null default '',
  add column if not exists visible_to text[] not null default array['all_agents'];

alter table public.memory_records
  add column if not exists owner_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists owner_agent_name text not null default '',
  add column if not exists department text not null default '',
  add column if not exists approved_by text not null default '',
  add column if not exists approved_by_id uuid references auth.users(id) on delete set null,
  add column if not exists effective_date timestamptz,
  add column if not exists visibility text not null default 'all_agents'
    check (visibility in ('all_agents', 'founder_and_agents', 'department', 'custodian_only')),
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Detach records from categories before restructuring
update public.memory_records set category_id = null where category_id is not null;
update public.agent_memories set category_id = null where category_id is not null;

delete from public.brain_categories;
delete from public.brain_domains;

-- Four locked layers
insert into public.brain_domains (slug, name, description, icon, sort_order, is_system, is_locked, layer_purpose) values
  ('strategic', 'Strategic Layer', 'Why InnovateAegis exists and where it is going', '◈', 1, true, true,
   'Defines mission, vision, values, objectives, and company structure'),
  ('operational', 'Operational Layer', 'How InnovateAegis operates daily', '⚙', 2, true, true,
   'SOPs, decisions, knowledge, and workflows'),
  ('intelligence', 'Intelligence Layer', 'Organizational learning and strategic intelligence', '◆', 3, true, true,
   'Analytics, risk, innovation, and learning loops'),
  ('connectivity', 'Connectivity Layer', 'Relationship intelligence', '◎', 4, true, true,
   'Communication, partnerships, and customer knowledge')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_locked = true,
  layer_purpose = excluded.layer_purpose;

-- Strategic Layer sections
insert into public.brain_categories (domain_id, slug, name, description, sort_order, custodian_agent_role, visible_to)
select d.id, c.slug, c.name, c.description, c.sort_order, c.custodian, c.visible
from public.brain_domains d
cross join (values
  ('mission-vision', 'Mission & Vision', 'Company mission and long-term vision', 1, 'ceo', array['all_agents']),
  ('values-policies', 'Values & Policies', 'Core values and company policies', 2, 'ceo', array['all_agents']),
  ('objectives-goals', 'Objectives & Goals', 'Strategic objectives and measurable goals', 3, 'ceo', array['all_agents']),
  ('company-structure', 'Company Structure', 'Departments, roles, and reporting structure', 4, 'ceo', array['all_agents'])
) as c(slug, name, description, sort_order, custodian, visible)
where d.slug = 'strategic'
on conflict (domain_id, slug) do nothing;

-- Operational Layer sections
insert into public.brain_categories (domain_id, slug, name, description, sort_order, custodian_agent_role, visible_to)
select d.id, c.slug, c.name, c.description, c.sort_order, c.custodian, c.visible
from public.brain_domains d
cross join (values
  ('sops', 'SOPs', 'Standard operating procedures', 1, 'documentation', array['all_agents']),
  ('company-decisions', 'Company Decisions', 'Approved strategic and operational decisions', 2, 'documentation', array['all_agents']),
  ('company-knowledge', 'Company Knowledge', 'Approved technical and business knowledge', 3, 'documentation', array['all_agents']),
  ('workflows-processes', 'Workflows & Processes', 'Operational workflows and processes', 4, 'coo', array['all_agents'])
) as c(slug, name, description, sort_order, custodian, visible)
where d.slug = 'operational'
on conflict (domain_id, slug) do nothing;

-- Intelligence Layer sections
insert into public.brain_categories (domain_id, slug, name, description, sort_order, custodian_agent_role, visible_to)
select d.id, c.slug, c.name, c.description, c.sort_order, c.custodian, c.visible
from public.brain_domains d
cross join (values
  ('data-analytics', 'Data & Analytics', 'Organizational metrics and analytics', 1, 'product-manager', array['all_agents']),
  ('risk-compliance', 'Risk & Compliance', 'Risk and compliance records', 2, 'solution-architect', array['all_agents']),
  ('innovation-sandbox', 'Innovation Sandbox', 'Experiments and innovation records', 3, 'product-manager', array['all_agents']),
  ('learning-feedback', 'Learning & Feedback', 'Lessons learned and feedback loops', 4, 'qa-engineer', array['all_agents'])
) as c(slug, name, description, sort_order, custodian, visible)
where d.slug = 'intelligence'
on conflict (domain_id, slug) do nothing;

-- Connectivity Layer sections
insert into public.brain_categories (domain_id, slug, name, description, sort_order, custodian_agent_role, visible_to)
select d.id, c.slug, c.name, c.description, c.sort_order, c.custodian, c.visible
from public.brain_domains d
cross join (values
  ('communication-framework', 'Communication Framework', 'Internal and external communication guidelines', 1, 'team-orchestrator', array['all_agents']),
  ('partnerships-ecosystem', 'Partnerships & Ecosystem', 'Partners and ecosystem relationships', 2, 'ceo', array['all_agents']),
  ('customer-knowledge-base', 'Customer Knowledge Base', 'Customer segments, needs, and feedback', 3, 'product-manager', array['all_agents'])
) as c(slug, name, description, sort_order, custodian, visible)
where d.slug = 'connectivity'
on conflict (domain_id, slug) do nothing;

-- Reassign all existing records to Strategic Layer / Mission & Vision
update public.memory_records mr
set
  domain_id = (select id from public.brain_domains where slug = 'strategic' limit 1),
  category_id = (select bc.id from public.brain_categories bc
    join public.brain_domains bd on bd.id = bc.domain_id
    where bd.slug = 'strategic' and bc.slug = 'mission-vision' limit 1)
where mr.domain_id is not null or mr.id is not null;

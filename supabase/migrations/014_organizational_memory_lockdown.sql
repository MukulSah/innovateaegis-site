-- Organizational Memory lockdown: event-based institutional memory

alter table public.organizational_memory
  add column if not exists memory_type text
    check (memory_type in ('event', 'decision', 'discussion', 'meeting', 'project', 'learning')),
  add column if not exists importance text not null default 'medium'
    check (importance in ('critical', 'high', 'medium', 'low')),
  add column if not exists outcome text not null default '',
  add column if not exists participant_agent_ids uuid[] not null default '{}',
  add column if not exists participant_names text[] not null default '{}',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists occurred_at timestamptz,
  add column if not exists story_key text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists related_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists related_approval_id uuid,
  add column if not exists related_release_id uuid,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

-- Migrate legacy category → memory_type
update public.organizational_memory
set memory_type = case category
  when 'meeting' then 'meeting'
  when 'decision' then 'decision'
  when 'project' then 'project'
  when 'conversation' then 'discussion'
  when 'knowledge' then 'learning'
  else 'event'
end
where memory_type is null;

update public.organizational_memory
set occurred_at = coalesce(occurred_at, created_at)
where occurred_at is null;

create index if not exists org_memory_type_idx on public.organizational_memory (memory_type);
create index if not exists org_memory_importance_idx on public.organizational_memory (importance);
create index if not exists org_memory_occurred_idx on public.organizational_memory (occurred_at desc);
create index if not exists org_memory_story_key_idx on public.organizational_memory (story_key);
create unique index if not exists org_memory_source_entity_uidx
  on public.organizational_memory (source_entity_type, source_entity_id)
  where source_entity_type is not null and source_entity_id is not null;

-- Memory relationship links (institutional graph)
create table if not exists public.org_memory_relationships (
  id uuid primary key default gen_random_uuid(),
  source_memory_id uuid not null references public.organizational_memory(id) on delete cascade,
  target_memory_id uuid references public.organizational_memory(id) on delete set null,
  target_entity_type text,
  target_entity_id uuid,
  relationship_type text not null default 'related_to'
    check (relationship_type in (
      'related_to', 'caused_by', 'led_to', 'decided_in', 'discussed_in',
      'documented_in', 'learned_from', 'participated_in', 'blocks', 'references'
    )),
  label text,
  created_at timestamptz not null default now()
);

create index if not exists org_memory_rel_source_idx on public.org_memory_relationships (source_memory_id);
create index if not exists org_memory_rel_target_idx on public.org_memory_relationships (target_memory_id);

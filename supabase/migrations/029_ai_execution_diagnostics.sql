-- AI execution diagnostics: prompt size, latency, timeout tracking

alter table public.ai_execution_events
  add column if not exists prompt_length integer,
  add column if not exists estimated_input_tokens integer,
  add column if not exists response_time_ms integer,
  add column if not exists timeout_ms integer,
  add column if not exists failure_reason text;

create index if not exists idx_ai_execution_events_success on public.ai_execution_events(success, created_at desc);

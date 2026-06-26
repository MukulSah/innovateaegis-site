-- AI provider model pool for catalog auto-rotation (NVIDIA NIM, OpenRouter, etc.)

alter table public.ai_providers
  add column if not exists model_pool jsonb not null default '[]'::jsonb,
  add column if not exists auto_rotate_models boolean not null default false;

alter table public.company_ai_settings
  add column if not exists auto_model_rotation boolean not null default true;

-- Enable pgcrypto for uuid generation
create extension if not exists "pgcrypto";

-- Enable pgvector for semantic search if available
create extension if not exists "vector";

create table if not exists public.content_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_item_id text not null,
  type text not null,
  title text not null,
  description text,
  url text,
  image text,
  language text,
  country text,
  source text,
  channel_title text,
  published_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_catalog_unique_provider_item unique (provider, provider_item_id)
);

create index if not exists content_catalog_provider_idx on public.content_catalog (provider);
create index if not exists content_catalog_type_idx on public.content_catalog (type);
create index if not exists content_catalog_published_idx on public.content_catalog (published_at desc nulls last);

create table if not exists public.content_embeddings (
  content_id uuid primary key references public.content_catalog (id) on delete cascade,
  embedding vector(1536),
  embedding_json jsonb,
  embedding_model text not null,
  embedded_at timestamptz not null default now()
);

create index if not exists content_embeddings_model_idx on public.content_embeddings (embedding_model);

create table if not exists public.interest_embeddings (
  interest_id uuid primary key references public.interests (id) on delete cascade,
  embedding vector(1536),
  embedding_json jsonb,
  embedding_model text not null,
  embedded_at timestamptz not null default now()
);

create table if not exists public.content_quality_flags (
  content_id uuid primary key references public.content_catalog (id) on delete cascade,
  is_ad boolean not null default false,
  is_offtopic boolean not null default false,
  llm_score real,
  llm_reason text,
  flagged_at timestamptz not null default now()
);

create table if not exists public.user_content_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  content_id uuid references public.content_catalog (id),
  event text not null,
  created_at timestamptz not null default now()
);

alter table public.user_content_events enable row level security;

create policy "User can see own content events" on public.user_content_events
  for select using (auth.uid() = user_id);

create policy "User can insert own content events" on public.user_content_events
  for insert with check (auth.uid() = user_id);

-- Basic read permissions (service role or elevated access) can be applied in application code.

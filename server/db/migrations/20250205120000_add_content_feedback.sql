create extension if not exists "pgcrypto";

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  content_id text not null,
  provider text not null,
  type text not null,
  interest_ids uuid[] not null default '{}',
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now()
);

alter table public.content_feedback enable row level security;

create policy "Allow authenticated content feedback insert" on public.content_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Allow anonymous content feedback insert" on public.content_feedback
  for insert
  to anon
  with check (user_id is null);

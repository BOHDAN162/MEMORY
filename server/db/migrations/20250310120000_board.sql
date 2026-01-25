-- Enable pgcrypto for uuid generation
create extension if not exists "pgcrypto";

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My board',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_nodes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  type text not null,
  position jsonb not null,
  data jsonb not null default '{}'::jsonb,
  style jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_edges (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  source text not null,
  target text not null,
  type text,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_viewport (
  board_id uuid primary key references public.boards (id) on delete cascade,
  viewport jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists board_nodes_board_id_idx on public.board_nodes (board_id);
create index if not exists board_edges_board_id_idx on public.board_edges (board_id);

alter table public.boards enable row level security;
alter table public.board_nodes enable row level security;
alter table public.board_edges enable row level security;
alter table public.board_viewport enable row level security;

create policy "Boards are visible to owner" on public.boards
  for select using (auth.uid() = user_id);

create policy "Boards can be inserted by owner" on public.boards
  for insert with check (auth.uid() = user_id);

create policy "Boards can be updated by owner" on public.boards
  for update using (auth.uid() = user_id);

create policy "Boards can be deleted by owner" on public.boards
  for delete using (auth.uid() = user_id);

create policy "Board nodes are visible to owner" on public.board_nodes
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board nodes can be inserted by owner" on public.board_nodes
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board nodes can be updated by owner" on public.board_nodes
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board nodes can be deleted by owner" on public.board_nodes
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board edges are visible to owner" on public.board_edges
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board edges can be inserted by owner" on public.board_edges
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board edges can be updated by owner" on public.board_edges
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board edges can be deleted by owner" on public.board_edges
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board viewport is visible to owner" on public.board_viewport
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board viewport can be inserted by owner" on public.board_viewport
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board viewport can be updated by owner" on public.board_viewport
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

create policy "Board viewport can be deleted by owner" on public.board_viewport
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.user_id = auth.uid()
    )
  );

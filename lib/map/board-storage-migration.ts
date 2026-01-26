export const boardStorageMigrationSql = `-- Ensure pgcrypto for uuid generation
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My board',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'boards' and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'boards' and column_name = 'owner_user_id'
  ) then
    alter table public.boards rename column user_id to owner_user_id;
  end if;
end;
$$;

alter table public.boards
  add column if not exists owner_user_id uuid;

alter table public.boards
  alter column owner_user_id set not null;

alter table public.boards
  drop constraint if exists boards_user_id_fkey;

alter table public.boards
  drop constraint if exists boards_owner_user_id_fkey;

alter table public.boards
  add constraint boards_owner_user_id_fkey foreign key (owner_user_id) references auth.users (id) on delete cascade;

create unique index if not exists boards_owner_user_id_key on public.boards(owner_user_id);

create table if not exists public.board_nodes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  type text not null,
  x double precision not null,
  y double precision not null,
  width double precision,
  height double precision,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_nodes
  add column if not exists x double precision,
  add column if not exists y double precision,
  add column if not exists width double precision,
  add column if not exists height double precision,
  add column if not exists rotation double precision not null default 0,
  add column if not exists z_index integer not null default 0,
  add column if not exists data jsonb not null default '{}'::jsonb;

alter table public.board_nodes
  drop column if exists style;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_nodes' and column_name = 'position'
  ) then
    update public.board_nodes
      set x = (position->>'x')::double precision,
          y = (position->>'y')::double precision
      where position is not null and (x is null or y is null);
    alter table public.board_nodes drop column if exists position;
  end if;
end;
$$;

update public.board_nodes
  set x = coalesce(x, 0),
      y = coalesce(y, 0)
  where x is null or y is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_nodes' and column_name = 'width'
  ) then
    alter table public.board_nodes
      alter column width type double precision using width::double precision;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_nodes' and column_name = 'height'
  ) then
    alter table public.board_nodes
      alter column height type double precision using height::double precision;
  end if;
end;
$$;

alter table public.board_nodes
  alter column x set not null,
  alter column y set not null,
  alter column rotation set default 0,
  alter column z_index set default 0;

create index if not exists board_nodes_board_id_idx on public.board_nodes (board_id);
create index if not exists board_nodes_type_idx on public.board_nodes (type);

create table if not exists public.board_edges (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  source_node_id uuid not null references public.board_nodes (id) on delete cascade,
  target_node_id uuid not null references public.board_nodes (id) on delete cascade,
  label text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_edges
  add column if not exists source_node_id uuid,
  add column if not exists target_node_id uuid,
  add column if not exists label text,
  add column if not exists data jsonb not null default '{}'::jsonb;

alter table public.board_edges
  drop column if exists type,
  drop column if exists style;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_edges' and column_name = 'source'
  ) then
    update public.board_edges
      set source_node_id = case
        when source ~* '^[0-9a-f\\-]{36}$' then source::uuid
        else source_node_id
      end,
      target_node_id = case
        when target ~* '^[0-9a-f\\-]{36}$' then target::uuid
        else target_node_id
      end
      where source_node_id is null or target_node_id is null;
    alter table public.board_edges drop column if exists source;
    alter table public.board_edges drop column if exists target;
  end if;
end;
$$;

delete from public.board_edges
  where source_node_id is null or target_node_id is null;

alter table public.board_edges
  drop constraint if exists board_edges_source_fkey,
  drop constraint if exists board_edges_target_fkey,
  drop constraint if exists board_edges_source_node_id_fkey,
  drop constraint if exists board_edges_target_node_id_fkey;

alter table public.board_edges
  add constraint board_edges_source_node_id_fkey foreign key (source_node_id) references public.board_nodes (id) on delete cascade,
  add constraint board_edges_target_node_id_fkey foreign key (target_node_id) references public.board_nodes (id) on delete cascade;

alter table public.board_edges
  alter column source_node_id set not null,
  alter column target_node_id set not null;

create index if not exists board_edges_board_id_idx on public.board_edges (board_id);
create index if not exists board_edges_source_node_id_idx on public.board_edges (source_node_id);
create index if not exists board_edges_target_node_id_idx on public.board_edges (target_node_id);

create table if not exists public.board_viewport (
  board_id uuid primary key references public.boards (id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  zoom double precision not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.board_viewport
  add column if not exists x double precision not null default 0,
  add column if not exists y double precision not null default 0,
  add column if not exists zoom double precision not null default 1;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_viewport' and column_name = 'viewport'
  ) then
    update public.board_viewport
      set x = (viewport->>'x')::double precision,
          y = (viewport->>'y')::double precision,
          zoom = (viewport->>'zoom')::double precision
      where viewport is not null and (x is null or y is null or zoom is null);
    alter table public.board_viewport drop column if exists viewport;
  end if;
end;
$$;

alter table public.boards enable row level security;
alter table public.board_nodes enable row level security;
alter table public.board_edges enable row level security;
alter table public.board_viewport enable row level security;

drop policy if exists "Boards are visible to owner" on public.boards;
drop policy if exists "Boards can be inserted by owner" on public.boards;
drop policy if exists "Boards can be updated by owner" on public.boards;
drop policy if exists "Boards can be deleted by owner" on public.boards;

drop policy if exists "Board nodes are visible to owner" on public.board_nodes;
drop policy if exists "Board nodes can be inserted by owner" on public.board_nodes;
drop policy if exists "Board nodes can be updated by owner" on public.board_nodes;
drop policy if exists "Board nodes can be deleted by owner" on public.board_nodes;

drop policy if exists "Board edges are visible to owner" on public.board_edges;
drop policy if exists "Board edges can be inserted by owner" on public.board_edges;
drop policy if exists "Board edges can be updated by owner" on public.board_edges;
drop policy if exists "Board edges can be deleted by owner" on public.board_edges;

drop policy if exists "Board viewport is visible to owner" on public.board_viewport;
drop policy if exists "Board viewport can be inserted by owner" on public.board_viewport;
drop policy if exists "Board viewport can be updated by owner" on public.board_viewport;
drop policy if exists "Board viewport can be deleted by owner" on public.board_viewport;

create policy "Boards select by owner" on public.boards
  for select using (auth.uid() = owner_user_id);

create policy "Boards insert by owner" on public.boards
  for insert with check (auth.uid() = owner_user_id);

create policy "Boards update by owner" on public.boards
  for update using (auth.uid() = owner_user_id);

create policy "Boards delete by owner" on public.boards
  for delete using (auth.uid() = owner_user_id);

create policy "Board nodes select by owner" on public.board_nodes
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board nodes insert by owner" on public.board_nodes
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board nodes update by owner" on public.board_nodes
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board nodes delete by owner" on public.board_nodes
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board edges select by owner" on public.board_edges
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board edges insert by owner" on public.board_edges
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board edges update by owner" on public.board_edges
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board edges delete by owner" on public.board_edges
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board viewport select by owner" on public.board_viewport
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board viewport insert by owner" on public.board_viewport
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board viewport update by owner" on public.board_viewport
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "Board viewport delete by owner" on public.board_viewport
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_user_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'set_updated_at_boards') then
    drop trigger set_updated_at_boards on public.boards;
  end if;
  if exists (select 1 from pg_trigger where tgname = 'set_updated_at_board_nodes') then
    drop trigger set_updated_at_board_nodes on public.board_nodes;
  end if;
  if exists (select 1 from pg_trigger where tgname = 'set_updated_at_board_edges') then
    drop trigger set_updated_at_board_edges on public.board_edges;
  end if;
  if exists (select 1 from pg_trigger where tgname = 'set_updated_at_board_viewport') then
    drop trigger set_updated_at_board_viewport on public.board_viewport;
  end if;
end;
$$;

create trigger set_updated_at_boards
  before update on public.boards
  for each row
  execute procedure public.set_updated_at();

create trigger set_updated_at_board_nodes
  before update on public.board_nodes
  for each row
  execute procedure public.set_updated_at();

create trigger set_updated_at_board_edges
  before update on public.board_edges
  for each row
  execute procedure public.set_updated_at();

create trigger set_updated_at_board_viewport
  before update on public.board_viewport
  for each row
  execute procedure public.set_updated_at();
`;

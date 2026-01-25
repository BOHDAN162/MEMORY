create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create unique index if not exists boards_user_id_key on public.boards(user_id);

alter table public.board_nodes
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists z_index integer not null default 0;

alter table public.board_edges
  add column if not exists style jsonb not null default '{}'::jsonb;

alter table public.board_edges
  alter column data set default '{}'::jsonb,
  alter column data set not null;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_boards'
  ) then
    drop trigger set_updated_at_boards on public.boards;
  end if;
  if exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_board_nodes'
  ) then
    drop trigger set_updated_at_board_nodes on public.board_nodes;
  end if;
  if exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_board_edges'
  ) then
    drop trigger set_updated_at_board_edges on public.board_edges;
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

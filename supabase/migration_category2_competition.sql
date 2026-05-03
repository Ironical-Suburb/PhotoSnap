-- ─── Category 2: Competition ────────────────────────────────────────────���────
-- Accuracy Leagues are computed entirely from the rounds table (no new table).
-- Duels require their own table.

create table if not exists public.duels (
  id                  uuid primary key default uuid_generate_v4(),
  challenger_id       uuid not null references public.users(id) on delete cascade,
  opponent_id         uuid not null references public.users(id) on delete cascade,
  challenger_photo_id uuid references public.photos(id) on delete set null,
  opponent_photo_id   uuid references public.photos(id) on delete set null,
  -- Each player's score = how well THEY guessed the OTHER's photo
  challenger_score    integer,
  opponent_score      integer,
  winner_id           uuid references public.users(id),
  status              text not null default 'pending'
    check (status in ('pending', 'active', 'complete', 'rejected')),
  created_at          timestamptz default now()
);

alter table public.duels enable row level security;

create policy "duels: involved read" on public.duels for select
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "duels: challenger insert" on public.duels for insert
  with check (auth.uid() = challenger_id);

create policy "duels: involved update" on public.duels for update
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (mirrors auth.users, extended with display name)
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- Friendships (directional: sender sends request, receiver accepts)
create table public.friendships (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at  timestamptz default now(),
  unique(sender_id, receiver_id)
);

-- Photos (sent from one user to a specific friend as a challenge)
create table public.photos (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid not null references public.users(id) on delete cascade,
  receiver_id  uuid not null references public.users(id) on delete cascade,
  storage_url  text not null,
  actual_date  date not null,
  caption      text,
  created_at   timestamptz default now()
);

-- Rounds (one per photo — the receiver's guess)
create table public.rounds (
  id          uuid primary key default uuid_generate_v4(),
  photo_id    uuid not null references public.photos(id) on delete cascade,
  guesser_id  uuid not null references public.users(id) on delete cascade,
  guess_date  date,           -- null until guess is submitted
  score       integer,        -- null until resolved
  resolved_at timestamptz,
  created_at  timestamptz default now(),
  unique(photo_id, guesser_id)
);

-- Leaderboard view (total score per user across all rounds)
create view public.leaderboard as
  select
    r.guesser_id                                              as user_id,
    u.display_name,
    coalesce(sum(r.score), 0)                                 as total_score,
    count(r.id) filter (where r.resolved_at is not null)      as rounds_played
  from public.rounds r
  join public.users u on u.id = r.guesser_id
  group by r.guesser_id, u.display_name;

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.users       enable row level security;
alter table public.friendships enable row level security;
alter table public.photos      enable row level security;
alter table public.rounds      enable row level security;

-- Users: anyone authenticated can search; only owner can update
create policy "users: read any"    on public.users for select using (auth.role() = 'authenticated');
create policy "users: insert own"  on public.users for insert with check (auth.uid() = id);
create policy "users: update own"  on public.users for update  using (auth.uid() = id);

-- Friendships: sender or receiver can read; only sender can insert; only receiver can update (accept/reject)
create policy "friendships: read involved" on public.friendships for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "friendships: sender insert" on public.friendships for insert
  with check (auth.uid() = sender_id);
create policy "friendships: receiver update" on public.friendships for update
  using (auth.uid() = receiver_id);
create policy "friendships: involved delete" on public.friendships for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Photos: sender can insert; sender and receiver can read
create policy "photos: involved read" on public.photos for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "photos: sender insert" on public.photos for insert
  with check (auth.uid() = sender_id);

-- Rounds: guesser owns their round; photo sender can read results
create policy "rounds: guesser read" on public.rounds for select
  using (
    auth.uid() = guesser_id or
    auth.uid() in (select sender_id from public.photos where id = photo_id)
  );
create policy "rounds: guesser insert" on public.rounds for insert
  with check (auth.uid() = guesser_id);
create policy "rounds: guesser update" on public.rounds for update
  using (auth.uid() = guesser_id);

-- ─── Storage bucket ──────────────────────────────────────────────────────────
-- Run in Supabase dashboard → Storage:
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);

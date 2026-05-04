-- ─── Feed & Streaks Migration ────────────────────────────────────────────────

-- Make receiver_id optional (feed posts go to everyone, not one person)
alter table public.photos
  alter column receiver_id drop not null;

-- Make actual_date optional (location-only or no-challenge posts don't need it)
alter table public.photos
  alter column actual_date drop not null;

-- Add feed/challenge columns
alter table public.photos
  add column if not exists is_post        boolean          not null default false,
  add column if not exists challenge_type text             not null default 'date'
    check (challenge_type in ('date', 'location', 'both', 'none')),
  add column if not exists location_lat   double precision,
  add column if not exists location_lon   double precision,
  add column if not exists location_hint  text;

-- Add streak columns to users
alter table public.users
  add column if not exists current_streak  integer not null default 0,
  add column if not exists longest_streak  integer not null default 0,
  add column if not exists last_post_date  date;

-- Add location guess column to rounds
alter table public.rounds
  add column if not exists guess_location text;

-- ─── Post Likes ───────────────────────────────────────────────────────────────

create table if not exists public.post_likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "post_likes: read any"   on public.post_likes for select using (auth.role() = 'authenticated');
create policy "post_likes: insert own" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes: delete own" on public.post_likes for delete using  (auth.uid() = user_id);

-- ─── Feed RLS ─────────────────────────────────────────────────────────────────
-- Feed posts visible to poster + all accepted friends

create policy "photos: friends read feed post" on public.photos
  for select using (
    is_post = true
    and (
      auth.uid() = sender_id
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.sender_id   = auth.uid() and f.receiver_id = photos.sender_id)
            or
            (f.receiver_id = auth.uid() and f.sender_id   = photos.sender_id)
          )
      )
    )
  );

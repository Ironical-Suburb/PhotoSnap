-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — apply all pending migrations in one shot
-- Run this entire file in the Supabase SQL editor.
-- Every statement uses IF NOT EXISTS / IF EXISTS so it is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── push_token ───────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists push_token      text,
  add column if not exists current_streak  integer not null default 0,
  add column if not exists longest_streak  integer not null default 0,
  add column if not exists last_post_date  date,
  add column if not exists backup_enabled  boolean not null default false;

-- ─── photos: make receiver_id / actual_date optional ──────────────────────────
alter table public.photos
  alter column receiver_id drop not null;

alter table public.photos
  alter column actual_date drop not null;

-- ─── photos: feed / challenge columns ─────────────────────────────────────────
alter table public.photos
  add column if not exists is_post        boolean          not null default false,
  add column if not exists is_daily_moment boolean         not null default false,
  add column if not exists challenge_type text             not null default 'date'
    check (challenge_type in ('date', 'location', 'both', 'none')),
  add column if not exists location_lat   double precision,
  add column if not exists location_lon   double precision,
  add column if not exists location_hint  text;

-- ─── rounds: location guess ───────────────────────────────────────────────────
alter table public.rounds
  add column if not exists guess_location text;

-- ─── daily_moments ────────────────────────────────────────────────────────────
create table if not exists public.daily_moments (
  id           uuid primary key default uuid_generate_v4(),
  triggered_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  is_active    boolean     not null default true
);

alter table public.daily_moments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'daily_moments' and policyname = 'daily_moments: read any'
  ) then
    create policy "daily_moments: read any" on public.daily_moments
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

create or replace function public.trigger_daily_moment()
returns void language plpgsql security definer as $$
begin
  update public.daily_moments set is_active = false;
  insert into public.daily_moments (triggered_at, expires_at, is_active)
  values (now(), now() + interval '2 hours', true);
end;
$$;

-- ─── post_likes ───────────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'post_likes' and policyname = 'post_likes: read any') then
    create policy "post_likes: read any"   on public.post_likes for select using (auth.role() = 'authenticated');
    create policy "post_likes: insert own" on public.post_likes for insert with check (auth.uid() = user_id);
    create policy "post_likes: delete own" on public.post_likes for delete using  (auth.uid() = user_id);
  end if;
end $$;

-- ─── post_reactions ───────────────────────────────────────────────────────────
create table if not exists public.post_reactions (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  emoji      text not null check (emoji in ('🔥', '😂', '😮', '💀')),
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_reactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions: read any') then
    create policy "post_reactions: read any"   on public.post_reactions for select using (auth.role() = 'authenticated');
    create policy "post_reactions: insert own" on public.post_reactions for insert with check (auth.uid() = user_id);
    create policy "post_reactions: delete own" on public.post_reactions for delete using  (auth.uid() = user_id);
    create policy "post_reactions: update own" on public.post_reactions for update using  (auth.uid() = user_id);
  end if;
end $$;

-- ─── duels ────────────────────────────────────────────────────────────────────
create table if not exists public.duels (
  id                  uuid primary key default uuid_generate_v4(),
  challenger_id       uuid not null references public.users(id) on delete cascade,
  opponent_id         uuid not null references public.users(id) on delete cascade,
  challenger_photo_id uuid references public.photos(id) on delete set null,
  opponent_photo_id   uuid references public.photos(id) on delete set null,
  challenger_score    integer,
  opponent_score      integer,
  winner_id           uuid references public.users(id),
  status              text not null default 'pending'
    check (status in ('pending', 'active', 'complete', 'rejected')),
  created_at          timestamptz default now()
);

alter table public.duels enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'duels' and policyname = 'duels: involved read') then
    create policy "duels: involved read" on public.duels for select
      using (auth.uid() = challenger_id or auth.uid() = opponent_id);
    create policy "duels: challenger insert" on public.duels for insert
      with check (auth.uid() = challenger_id);
    create policy "duels: involved update" on public.duels for update
      using (auth.uid() = challenger_id or auth.uid() = opponent_id);
  end if;
end $$;

-- ─── messages (DM) ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content     text not null,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

alter table public.messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'messages: involved read') then
    create policy "messages: involved read" on public.messages for select
      using (auth.uid() = sender_id or auth.uid() = receiver_id);
    create policy "messages: sender insert" on public.messages for insert
      with check (auth.uid() = sender_id);
    create policy "messages: receiver update" on public.messages for update
      using (auth.uid() = receiver_id);
  end if;
end $$;

-- ─── feed RLS: friends can read feed posts ────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'photos' and policyname = 'photos: friends read feed post') then
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
  end if;
end $$;

-- ─── photos: sender can insert feed posts ────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'photos' and policyname = 'photos: sender insert') then
    create policy "photos: sender insert" on public.photos
      for insert with check (auth.uid() = sender_id);
  end if;
end $$;

-- ─── Storage buckets ──────────────────────────────────────────────────────────
-- Create the Photos bucket (used by UploadScreen)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('Photos', 'Photos', false, 52428800, array['image/jpeg', 'image/png', 'application/octet-stream'])
on conflict (id) do nothing;

-- Create the avatars bucket (used by ProfileScreen)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ─── Storage RLS policies ─────────────────────────────────────────────────────
-- Photos bucket: authenticated users upload to their own folder; read via signed URL
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Photos: owner upload') then
    create policy "Photos: owner upload" on storage.objects
      for insert with check (
        bucket_id = 'Photos'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
    create policy "Photos: authenticated read" on storage.objects
      for select using (
        bucket_id = 'Photos'
        and auth.role() = 'authenticated'
      );
    create policy "Photos: owner delete" on storage.objects
      for delete using (
        bucket_id = 'Photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- Avatars bucket: users upload their own; anyone can read (public bucket)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'avatars: owner upload') then
    create policy "avatars: owner upload" on storage.objects
      for insert with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
      );
    create policy "avatars: public read" on storage.objects
      for select using (bucket_id = 'avatars');
    create policy "avatars: owner delete" on storage.objects
      for delete using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

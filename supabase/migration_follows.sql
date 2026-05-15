-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — directional follows + account privacy
-- Replaces the mutual-friendship model with a follower/following model.
-- Backfills existing accepted friendships in both directions.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add is_private to users (default public)
alter table public.users
  add column if not exists is_private boolean not null default false;

-- 2. New follows table
create table if not exists public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  status       text not null check (status in ('active','pending')) default 'active',
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists follows_status_idx       on public.follows (status);

-- 3. Trigger: if target user is private, force status='pending' on insert
create or replace function public.follows_set_pending_for_private()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' and exists (
    select 1 from public.users u
    where u.id = new.following_id and u.is_private = true
  ) then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists follows_pending_for_private on public.follows;
create trigger follows_pending_for_private
  before insert on public.follows
  for each row execute function public.follows_set_pending_for_private();

-- 4. RLS
alter table public.follows enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'follows' and policyname = 'follows: read any') then
    create policy "follows: read any"          on public.follows for select using (auth.role() = 'authenticated');
    create policy "follows: insert own"        on public.follows for insert with check (auth.uid() = follower_id);
    create policy "follows: update by followee" on public.follows for update using  (auth.uid() = following_id);
    create policy "follows: delete by either"  on public.follows for delete using  (auth.uid() = follower_id or auth.uid() = following_id);
  end if;
end $$;

-- 5. Backfill from existing friendships (only if friendships table still exists)
do $$ begin
  if to_regclass('public.friendships') is not null then
    insert into public.follows (follower_id, following_id, status)
      select sender_id, receiver_id, 'active' from public.friendships where status = 'accepted'
      on conflict do nothing;
    insert into public.follows (follower_id, following_id, status)
      select receiver_id, sender_id, 'active' from public.friendships where status = 'accepted'
      on conflict do nothing;
    insert into public.follows (follower_id, following_id, status)
      select sender_id, receiver_id, 'pending' from public.friendships where status = 'pending'
      on conflict do nothing;
  end if;
end $$;

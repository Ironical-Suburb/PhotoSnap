-- ─── Category 1: Urgency & FOMO ─────────────────────────────────────────────

-- Daily moment flag on individual posts
alter table public.photos
  add column if not exists is_daily_moment boolean not null default false;

-- Daily moment windows — server writes these, clients read them
create table if not exists public.daily_moments (
  id           uuid primary key default uuid_generate_v4(),
  triggered_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  is_active    boolean     not null default true
);

alter table public.daily_moments enable row level security;
create policy "daily_moments: read any" on public.daily_moments
  for select using (auth.role() = 'authenticated');

-- Post reactions: one reaction per user per post, upsert to change emoji
create table if not exists public.post_reactions (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  emoji      text not null check (emoji in ('🔥', '😂', '😮', '💀')),
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_reactions enable row level security;
create policy "post_reactions: read any"   on public.post_reactions for select using (auth.role() = 'authenticated');
create policy "post_reactions: insert own" on public.post_reactions for insert with check (auth.uid() = user_id);
create policy "post_reactions: delete own" on public.post_reactions for delete using  (auth.uid() = user_id);
create policy "post_reactions: update own" on public.post_reactions for update using  (auth.uid() = user_id);

-- Call this from Supabase dashboard or pg_cron to fire a daily moment.
-- pg_cron example (runs every 3 hours between 9am-9pm):
--   SELECT cron.schedule('daily-moment', '0 9,12,15,18,21 * * *', 'SELECT public.trigger_daily_moment()');
create or replace function public.trigger_daily_moment()
returns void language plpgsql security definer as $$
begin
  update public.daily_moments set is_active = false;
  insert into public.daily_moments (triggered_at, expires_at, is_active)
  values (now(), now() + interval '2 hours', true);
end;
$$;

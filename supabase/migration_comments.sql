-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — post comments
-- Safe to re-run (uses IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.post_comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at desc);

alter table public.post_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments: read any') then
    create policy "post_comments: read any"   on public.post_comments for select using (auth.role() = 'authenticated');
    create policy "post_comments: insert own" on public.post_comments for insert with check (auth.uid() = user_id);
    create policy "post_comments: delete own" on public.post_comments for delete using  (
      auth.uid() = user_id
      or auth.uid() in (select sender_id from public.photos where id = post_id)
    );
  end if;
end $$;

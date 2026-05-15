-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — likes / dislikes on post comments
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id    uuid not null references public.users(id)         on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx
  on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comment_likes' and policyname = 'comment_likes: read any') then
    create policy "comment_likes: read any"   on public.comment_likes for select using (auth.role() = 'authenticated');
    create policy "comment_likes: insert own" on public.comment_likes for insert with check (auth.uid() = user_id);
    create policy "comment_likes: update own" on public.comment_likes for update using (auth.uid() = user_id);
    create policy "comment_likes: delete own" on public.comment_likes for delete using  (auth.uid() = user_id);
  end if;
end $$;

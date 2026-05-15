-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — replies on post comments
-- Adds a self-referential parent_id so a comment can reply to another.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.post_comments
  add column if not exists parent_id uuid
    references public.post_comments(id) on delete cascade;

create index if not exists post_comments_parent_id_idx
  on public.post_comments (parent_id);

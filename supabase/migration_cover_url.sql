-- ─────────────────────────────────────────────────────────────────────────────
-- PhotoSnap — profile cover/banner image
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users
  add column if not exists cover_url text;

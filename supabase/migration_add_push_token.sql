-- Run this in the Supabase SQL editor after the initial schema.sql
alter table public.users add column if not exists push_token text;

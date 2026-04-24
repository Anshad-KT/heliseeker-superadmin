-- Flat pages for public/legal content (Terms, Privacy, etc.)
-- Stored in DB so it works on serverless hosts (Vercel).

create extension if not exists "pgcrypto";

create table if not exists public.flat_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists flat_pages_slug_unique on public.flat_pages (slug);


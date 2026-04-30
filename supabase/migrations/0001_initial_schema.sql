-- supabase/migrations/0001_initial_schema.sql

create extension if not exists "pgcrypto";

create type case_industry as enum (
  'consulting', 'fmcg', 'tech', 'healthcare', 'finance',
  'infra', 'energy', 'retail', 'other'
);
create type case_type_enum as enum (
  'market_entry', 'profitability', 'mna', 'pricing',
  'operations', 'gtm', 'estimation', 'other'
);
create type case_difficulty as enum ('easy', 'medium', 'hard', 'expert');
create type session_status as enum ('in_progress', 'completed', 'abandoned');

create table casebooks (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  year int,
  title text not null,
  source_url text,
  local_path text,
  case_count int not null default 0,
  ingested_at timestamptz default now()
);

create extension if not exists pg_trgm;

create table cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  industry case_industry not null default 'other',
  case_type case_type_enum not null default 'other',
  difficulty case_difficulty not null default 'medium',
  source text,
  casebook_id uuid references casebooks(id) on delete set null,
  problem_statement text not null,
  interviewer_notes jsonb not null default '[]'::jsonb,
  ideal_structure jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index cases_industry_idx on cases (industry);
create index cases_case_type_idx on cases (case_type);
create index cases_difficulty_idx on cases (difficulty);
create index cases_title_trgm on cases using gin (title gin_trgm_ops);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  case_id uuid references cases(id) on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  transcript jsonb not null default '[]'::jsonb,
  score int,
  score_breakdown jsonb,
  status session_status not null default 'in_progress'
);
create index sessions_user_idx on sessions (user_id);
create index sessions_case_idx on sessions (case_id);

create table cheat_sheets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade unique not null,
  framework text,
  hypothesis text,
  key_numbers jsonb not null default '[]'::jsonb,
  decisions text[] not null default '{}',
  next_steps text[] not null default '{}',
  manual_notes text,
  locked_fields text[] not null default '{}',
  last_updated timestamptz default now()
);

create table email_allowlist (
  email text primary key,
  added_by text,
  added_at timestamptz default now()
);

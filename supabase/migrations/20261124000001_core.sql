-- 001 Core: schools (tenants), profiles, groups, memberships, parent links, audit log.
-- Every school-scoped table carries school_id so RLS policies stay simple and fast.

create schema if not exists private;  -- helpers and internals; not exposed through the API

create type public.app_role as enum ('super_admin', 'school_admin', 'instructor', 'student', 'parent');

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Schools (tenants)
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  package     text check (package in ('foundations', 'innovation', 'professional', 'custom')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.schools is 'Tenants. A suspended school loses access for all of its users.';
comment on column public.schools.package is 'B2B package the school bought.';

-- Profiles: one per auth user. Role and school are managed by admins via the API (service role).
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  school_id     uuid references public.schools (id) on delete restrict,
  role          public.app_role not null,
  full_name     text not null check (length(trim(full_name)) between 1 and 120),
  display_name  text check (length(display_name) between 1 and 60),
  avatar_url    text check (length(avatar_url) <= 500),
  locale        text not null default 'ar' check (locale in ('ar', 'en')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint profiles_school_matches_role check ((role = 'super_admin') = (school_id is null))
);
comment on table public.profiles is 'App user profile. super_admin has no school; every other role belongs to exactly one school.';
comment on column public.profiles.display_name is 'Name shown to classmates (leaderboard, chat). Users may edit it.';
create index profiles_school_role_idx on public.profiles (school_id, role) where deleted_at is null;

-- Groups (classes)
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  name           text not null check (length(trim(name)) between 1 and 80),
  grade          text check (length(grade) <= 20),
  instructor_id  uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (school_id, name)
);
create index groups_instructor_idx on public.groups (instructor_id);

create table public.group_members (
  group_id    uuid not null references public.groups (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  school_id   uuid not null references public.schools (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (group_id, student_id)
);
comment on column public.group_members.school_id is 'Copied from the group by trigger; never trusted from the client.';
create index group_members_student_idx on public.group_members (student_id);

create table public.parent_links (
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  school_id   uuid not null references public.schools (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (parent_id, student_id)
);
create index parent_links_student_idx on public.parent_links (student_id);

-- Audit log: written only by security-definer functions and the API.
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  school_id   uuid references public.schools (id) on delete set null,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
comment on table public.audit_logs is 'Who did what: point adjustments, grade changes, rule changes. Append-only.';
create index audit_logs_school_idx on public.audit_logs (school_id, created_at desc);

create trigger schools_updated_at  before update on public.schools  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger groups_updated_at   before update on public.groups   for each row execute function private.set_updated_at();

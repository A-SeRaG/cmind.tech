-- 004 Gamification: point rules, the append-only points ledger, lesson progress, badges.
-- Points are only ever written by security-definer functions (migration 006).

create type public.point_reason as enum ('assessment_full_mark', 'video_opened', 'article_opened', 'admin_adjustment');

create table public.point_rules (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid unique references public.schools (id) on delete cascade,
  full_mark   int not null default 10 check (full_mark between 0 and 1000),
  video       int not null default 5  check (video between 0 and 1000),
  article     int not null default 5  check (article between 0 and 1000),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
comment on table public.point_rules is 'school_id null = platform default; a school row overrides it.';
create unique index point_rules_single_default on public.point_rules ((true)) where school_id is null;

create table public.lesson_progress (
  student_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id        uuid not null references public.lessons (id) on delete cascade,
  school_id        uuid not null references public.schools (id) on delete cascade,
  first_opened_at  timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_school_idx on public.lesson_progress (school_id);

create table public.point_events (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  points         int not null check (points <> 0 and points between -1000 and 1000),
  reason         public.point_reason not null,
  ref_id         uuid,
  note           text check (length(note) <= 200),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_by     uuid references public.profiles (id) on delete set null,
  revoke_reason  text check (length(revoke_reason) <= 200),
  constraint point_events_ref_required  check (reason = 'admin_adjustment' or ref_id is not null),
  constraint point_events_note_required check (reason <> 'admin_adjustment' or length(trim(note)) >= 3),
  constraint point_events_revoke_reason check (revoked_at is null or revoke_reason is not null)
);
comment on table public.point_events is 'Append-only points ledger. Events are revoked (soft), never deleted.';
comment on column public.point_events.ref_id is 'lesson id for opens, submission id for full marks.';
-- At most one automatic award per student per lesson / submission, even under concurrent requests.
create unique index point_events_once on public.point_events (student_id, reason, ref_id) where reason <> 'admin_adjustment';
create index point_events_student_idx on public.point_events (student_id, created_at desc);
create index point_events_school_idx on public.point_events (school_id, created_at desc);

create table public.badges (
  key             text primary key check (key ~ '^[a-z_]{2,40}$'),
  name            text not null,
  name_ar         text not null,
  description     text not null,
  description_ar  text not null,
  icon            text not null,
  kind            text not null check (kind in ('first_lesson', 'points', 'full_mark', 'track_complete')),
  threshold       int check (threshold > 0),
  position        int not null default 0,
  constraint badges_threshold_for_points check ((kind = 'points') = (threshold is not null))
);

create table public.student_badges (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  badge_key   text not null references public.badges (key) on delete cascade,
  school_id   uuid not null references public.schools (id) on delete cascade,
  earned_at   timestamptz not null default now(),
  primary key (student_id, badge_key)
);
create index student_badges_school_idx on public.student_badges (school_id);

create trigger point_rules_updated_at before update on public.point_rules for each row execute function private.set_updated_at();

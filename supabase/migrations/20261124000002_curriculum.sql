-- 002 Curriculum: global tracks, lessons and final milestones (edited by super_admin),
-- and which groups are enrolled in which tracks (managed by school_admin).

create type public.lesson_type as enum ('video', 'article', 'assessment');

create table public.tracks (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name            text not null check (length(trim(name)) between 2 and 120),
  name_ar         text not null check (length(trim(name_ar)) between 2 and 120),
  description     text not null default '',
  description_ar  text not null default '',
  icon            text not null default '📘' check (length(icon) <= 16),
  level           text not null default 'Level 1' check (length(level) <= 40),
  position        int not null default 0,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.tracks is 'Global curriculum owned by CMind. Schools see published tracks; students see tracks their groups are enrolled in.';

create table public.lessons (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references public.tracks (id) on delete cascade,
  position      int not null check (position >= 0),
  type          public.lesson_type not null,
  title         text not null check (length(trim(title)) between 2 and 160),
  title_ar      text not null check (length(trim(title_ar)) between 2 and 160),
  summary       text not null default '',
  summary_ar    text not null default '',
  body          text,
  body_ar       text,
  video_url     text check (video_url ~ '^https://'),
  duration_min  int not null default 5 check (duration_min between 1 and 600),
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint lessons_track_position_key unique (track_id, position) deferrable initially deferred,
  constraint lessons_video_only_on_video check (video_url is null or type = 'video')
);
comment on column public.lessons.body is 'Article text (Markdown). Assessment lessons are completed by submitting a linked assignment.';
create index lessons_track_idx on public.lessons (track_id, position);

create table public.milestones (
  track_id        uuid primary key references public.tracks (id) on delete cascade,
  title           text not null check (length(trim(title)) between 2 and 160),
  title_ar        text not null check (length(trim(title_ar)) between 2 and 160),
  description     text not null default '',
  description_ar  text not null default '',
  updated_at      timestamptz not null default now()
);
comment on table public.milestones is 'One final milestone per track; unlocked when track progress reaches 100%.';

create table public.group_tracks (
  group_id     uuid not null references public.groups (id) on delete cascade,
  track_id     uuid not null references public.tracks (id) on delete cascade,
  school_id    uuid not null references public.schools (id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  primary key (group_id, track_id)
);
create index group_tracks_track_idx on public.group_tracks (track_id);
create index group_tracks_school_idx on public.group_tracks (school_id);

create trigger tracks_updated_at     before update on public.tracks     for each row execute function private.set_updated_at();
create trigger lessons_updated_at    before update on public.lessons    for each row execute function private.set_updated_at();
create trigger milestones_updated_at before update on public.milestones for each row execute function private.set_updated_at();

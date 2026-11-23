-- 003 Assessments: assignments per group (optionally linked to an assessment lesson),
-- MCQ questions with answer keys stored separately, and submissions.

create type public.assignment_type as enum ('mcq', 'upload');
create type public.submission_status as enum ('submitted', 'graded');

create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  group_id      uuid not null references public.groups (id) on delete cascade,
  lesson_id     uuid references public.lessons (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  title         text not null check (length(trim(title)) between 2 and 160),
  description   text not null default '',
  type          public.assignment_type not null,
  due_at        timestamptz not null,
  allow_late    boolean not null default false,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
comment on column public.assignments.lesson_id is 'Links the assignment to a track''s assessment lesson; submitting completes that lesson.';
comment on column public.assignments.published_at is 'Hidden from students until this time.';
create index assignments_group_due_idx on public.assignments (group_id, due_at desc) where deleted_at is null;
create index assignments_school_idx on public.assignments (school_id, created_at desc);
create index assignments_lesson_idx on public.assignments (lesson_id) where lesson_id is not null;

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  school_id      uuid not null references public.schools (id) on delete cascade,
  position       int not null check (position >= 0),
  prompt         text not null check (length(trim(prompt)) between 1 and 2000),
  options        jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  unique (assignment_id, position)
);
comment on column public.questions.options is 'JSON array of 2-6 option strings. The correct answer lives in question_keys.';

create table public.question_keys (
  question_id    uuid primary key references public.questions (id) on delete cascade,
  school_id      uuid not null references public.schools (id) on delete cascade,
  correct_index  int not null check (correct_index between 0 and 5)
);
comment on table public.question_keys is 'MCQ answer keys. Readable by staff only, so students cannot fetch answers.';

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  submitted_at   timestamptz not null default now(),
  answers        jsonb check (answers is null or jsonb_typeof(answers) = 'array'),
  file_path      text check (length(file_path) <= 500),
  status         public.submission_status not null default 'submitted',
  score          int check (score between 0 and 100),
  feedback       text check (length(feedback) <= 4000),
  graded_at      timestamptz,
  graded_by      uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assignment_id, student_id),
  constraint submissions_graded_has_score check ((status = 'graded') = (score is not null))
);
comment on table public.submissions is 'One per student per assignment. Written only through submit_assignment() and grade_submission().';
create index submissions_assignment_idx on public.submissions (assignment_id, status);
create index submissions_student_idx on public.submissions (student_id, submitted_at desc);

create trigger assignments_updated_at before update on public.assignments for each row execute function private.set_updated_at();
create trigger submissions_updated_at before update on public.submissions for each row execute function private.set_updated_at();

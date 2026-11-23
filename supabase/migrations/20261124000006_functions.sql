-- 006 Functions: auth helpers used by RLS, integrity triggers, progress views,
-- and the only code paths allowed to write points, progress and grades.
--
-- Conventions: security definer + search_path = '' + fully qualified names.
-- Boolean helpers always return true/false (never null) so `if not ...` checks are safe.

------------------------------------------------------------------------------------------
-- Auth helpers (who is calling?)
------------------------------------------------------------------------------------------

-- Role of the caller; null if no profile, deleted, or their school is suspended.
create function private.auth_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role
  from public.profiles p
  left join public.schools s on s.id = p.school_id
  where p.id = auth.uid()
    and p.deleted_at is null
    and (p.role = 'super_admin' or s.status = 'active')
$$;

create function private.auth_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.school_id
  from public.profiles p
  join public.schools s on s.id = p.school_id
  where p.id = auth.uid() and p.deleted_at is null and s.status = 'active'
$$;

create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.auth_role() = 'super_admin', false)
$$;

create function private.is_school_admin(p_school uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.auth_role() = 'school_admin' and private.auth_school_id() = p_school, false)
$$;

-- Caller is a student member of the group.
create function private.is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.auth_role() = 'student', false) and exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id and g.deleted_at is null
    where gm.group_id = p_group and gm.student_id = auth.uid()
  )
$$;

-- Caller manages the group: its instructor, an admin of its school, or super_admin.
create function private.is_group_staff(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_super_admin() or exists (
    select 1 from public.groups g
    where g.id = p_group
      and g.school_id = private.auth_school_id()
      and (private.auth_role() = 'school_admin'
           or (private.auth_role() = 'instructor' and g.instructor_id = auth.uid()))
  )
$$;

create function private.is_parent_of(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.auth_role() = 'parent', false) and exists (
    select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.student_id = p_student
  )
$$;

-- A parent of a student in the group.
create function private.is_parent_in_group(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.auth_role() = 'parent', false) and exists (
    select 1 from public.parent_links pl
    join public.group_members gm on gm.student_id = pl.student_id
    where pl.parent_id = auth.uid() and gm.group_id = p_group
  )
$$;

-- Staff who may see a student's work: super_admin, their school admin, or the instructor of one of their groups.
create function private.is_staff_of_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = p_student and p.role = 'student'
        and private.is_school_admin(p.school_id)
    )
    or (coalesce(private.auth_role() = 'instructor', false) and exists (
      select 1 from public.group_members gm
      join public.groups g on g.id = gm.group_id and g.deleted_at is null
      where gm.student_id = p_student and g.instructor_id = auth.uid()
    ))
$$;

-- The student themself, their staff, or their parent.
create function private.can_view_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (p_student = auth.uid() and coalesce(private.auth_role() = 'student', false))
    or private.is_staff_of_student(p_student)
    or private.is_parent_of(p_student)
$$;

-- Text variant for storage paths: never throws on a malformed id.
create function private.can_view_student_text(p_student text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_student ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.can_view_student(p_student::uuid)
    else false
  end
$$;

-- Who can see which profiles (beyond their own).
create function private.can_see_profile(p_id uuid, p_school uuid, p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_id = auth.uid()
    or private.is_super_admin()
    or (p_school is not null and p_school = private.auth_school_id() and (
      private.auth_role() = 'school_admin'
      -- instructors: school staff and their own students
      or (private.auth_role() = 'instructor'
          and (p_role in ('school_admin', 'instructor') or private.is_staff_of_student(p_id)))
      -- students: classmates and the instructors of their groups
      or (private.auth_role() = 'student' and exists (
            select 1 from public.group_members me
            join public.groups g on g.id = me.group_id and g.deleted_at is null
            where me.student_id = auth.uid()
              and (g.instructor_id = p_id
                   or exists (select 1 from public.group_members o where o.group_id = g.id and o.student_id = p_id))))
      -- parents: their children and their children's instructors
      or (private.auth_role() = 'parent' and (
            private.is_parent_of(p_id)
            or exists (
              select 1 from public.parent_links pl
              join public.group_members gm on gm.student_id = pl.student_id
              join public.groups g on g.id = gm.group_id and g.deleted_at is null
              where pl.parent_id = auth.uid() and g.instructor_id = p_id)))
    ))
$$;

-- Curriculum visibility: super_admin sees everything; school staff see published tracks;
-- students and parents see published tracks their (children's) groups are enrolled in.
create function private.has_track_access(p_track uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_super_admin() or exists (
    select 1 from public.tracks t
    where t.id = p_track and t.is_published and (
      private.auth_role() in ('school_admin', 'instructor')
      or (private.auth_role() = 'student' and exists (
            select 1 from public.group_tracks gt
            join public.group_members gm on gm.group_id = gt.group_id
            where gt.track_id = t.id and gm.student_id = auth.uid()))
      or (private.auth_role() = 'parent' and exists (
            select 1 from public.group_tracks gt
            join public.group_members gm on gm.group_id = gt.group_id
            join public.parent_links pl on pl.student_id = gm.student_id
            where gt.track_id = t.id and pl.parent_id = auth.uid()))
    )
  )
$$;

-- Storage: may the caller upload into this assignment's folder?
create function private.can_submit_to_text(p_assignment text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_assignment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then exists (
      select 1 from public.assignments a
      where a.id = p_assignment::uuid and a.type = 'upload' and a.deleted_at is null
        and private.is_group_member(a.group_id))
    else false
  end
$$;

------------------------------------------------------------------------------------------
-- Integrity triggers: copy school_id from the parent row (never trust the client)
-- and check cross-table rules that a foreign key cannot express.
------------------------------------------------------------------------------------------

create function private.tg_groups_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.instructor_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.instructor_id and p.role = 'instructor' and p.school_id = new.school_id and p.deleted_at is null
  ) then
    raise exception 'instructor must be an instructor of the same school' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.school_id <> old.school_id then
    raise exception 'a group cannot move to another school' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger groups_check before insert or update on public.groups
for each row execute function private.tg_groups_check();

create function private.tg_group_members_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select g.school_id into new.school_id from public.groups g where g.id = new.group_id;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.student_id and p.role = 'student' and p.school_id = new.school_id and p.deleted_at is null
  ) then
    raise exception 'only students of the same school can join a group' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger group_members_fill before insert or update on public.group_members
for each row execute function private.tg_group_members_fill();

create function private.tg_parent_links_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.school_id into new.school_id from public.profiles p
  where p.id = new.student_id and p.role = 'student' and p.deleted_at is null;
  if new.school_id is null or not exists (
    select 1 from public.profiles p
    where p.id = new.parent_id and p.role = 'parent' and p.school_id = new.school_id and p.deleted_at is null
  ) then
    raise exception 'parent and student must belong to the same school' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger parent_links_fill before insert or update on public.parent_links
for each row execute function private.tg_parent_links_fill();

create function private.tg_group_tracks_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select g.school_id into new.school_id from public.groups g where g.id = new.group_id;
  if not exists (select 1 from public.tracks t where t.id = new.track_id and t.is_published) then
    raise exception 'only published tracks can be enrolled' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger group_tracks_fill before insert or update on public.group_tracks
for each row execute function private.tg_group_tracks_fill();

create function private.tg_assignments_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select g.school_id into new.school_id from public.groups g where g.id = new.group_id;
  if new.lesson_id is not null and not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.type = 'assessment'
  ) then
    raise exception 'an assignment can only be linked to an assessment lesson' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger assignments_fill before insert or update on public.assignments
for each row execute function private.tg_assignments_fill();

create function private.tg_questions_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select a.school_id into new.school_id from public.assignments a where a.id = new.assignment_id;
  return new;
end $$;
create trigger questions_fill before insert or update on public.questions
for each row execute function private.tg_questions_fill();

create function private.tg_question_keys_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select q.school_id into new.school_id from public.questions q where q.id = new.question_id;
  if new.correct_index >= (select jsonb_array_length(q.options) from public.questions q where q.id = new.question_id) then
    raise exception 'correct_index is outside the options' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger question_keys_fill before insert or update on public.question_keys
for each row execute function private.tg_question_keys_fill();

create function private.tg_chat_messages_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select g.school_id into new.school_id from public.groups g where g.id = new.group_id;
  return new;
end $$;
create trigger chat_messages_fill before insert on public.chat_messages
for each row execute function private.tg_chat_messages_fill();

------------------------------------------------------------------------------------------
-- Read models (security_invoker: the caller's RLS applies)
------------------------------------------------------------------------------------------

create view public.student_points with (security_invoker = true) as
select pe.student_id, pe.school_id, greatest(0, sum(pe.points))::int as total_points
from public.point_events pe
where pe.revoked_at is null
group by pe.student_id, pe.school_id;
comment on view public.student_points is 'Current points per student, never below 0. Students without events are absent (treat as 0).';

create view public.track_progress with (security_invoker = true) as
with enrolled as (
  select distinct gm.student_id, gm.school_id, gt.track_id
  from public.group_members gm
  join public.group_tracks gt on gt.group_id = gm.group_id
)
select e.student_id, e.school_id, e.track_id,
  count(l.id)::int as total_lessons,
  count(l.id) filter (where
    exists (select 1 from public.lesson_progress lp where lp.student_id = e.student_id and lp.lesson_id = l.id)
    or exists (select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
               where a.lesson_id = l.id and s.student_id = e.student_id)
  )::int as completed_lessons
from enrolled e
join public.lessons l on l.track_id = e.track_id and l.is_published
group by e.student_id, e.school_id, e.track_id;
comment on view public.track_progress is 'Per student per enrolled track. Video/article done when opened; assessment done when submitted. Milestone unlocks at completed = total.';

------------------------------------------------------------------------------------------
-- Points internals (not callable by API users)
------------------------------------------------------------------------------------------

create function private.point_rules_for(p_school uuid) returns public.point_rules
language sql stable security definer set search_path = '' as $$
  select r.* from public.point_rules r
  where r.school_id = p_school or r.school_id is null
  order by r.school_id nulls last
  limit 1
$$;

create function private.refresh_student_badges(p_student uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_total  int;
begin
  select p.school_id into v_school from public.profiles p where p.id = p_student;
  select greatest(0, coalesce(sum(pe.points), 0)) into v_total
  from public.point_events pe where pe.student_id = p_student and pe.revoked_at is null;

  -- Badges are permanent once earned.
  insert into public.student_badges (student_id, badge_key, school_id)
  select p_student, b.key, v_school
  from public.badges b
  where case b.kind
    when 'first_lesson'   then exists (select 1 from public.lesson_progress lp where lp.student_id = p_student)
    when 'points'         then v_total >= b.threshold
    when 'full_mark'      then exists (select 1 from public.point_events pe
                                       where pe.student_id = p_student and pe.reason = 'assessment_full_mark' and pe.revoked_at is null)
    when 'track_complete' then exists (select 1 from public.track_progress tp
                                       where tp.student_id = p_student and tp.total_lessons > 0
                                         and tp.completed_lessons = tp.total_lessons)
    else false
  end
  on conflict do nothing;
end $$;

-- Inserts an automatic award at most once (unique index), then refreshes badges. Returns points added.
create function private.award(p_student uuid, p_school uuid, p_points int, p_reason public.point_reason, p_ref uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_points int;
begin
  if p_points <> 0 then
    insert into public.point_events (school_id, student_id, points, reason, ref_id, created_by)
    values (p_school, p_student, p_points, p_reason, p_ref, auth.uid())
    on conflict (student_id, reason, ref_id) where reason <> 'admin_adjustment' do nothing
    returning points into v_points;
  end if;
  perform private.refresh_student_badges(p_student);
  return coalesce(v_points, 0);
end $$;

-- Keeps the full-mark bonus consistent with the current grade:
-- awards it, revokes it after a regrade below 100, restores it after a regrade back to 100.
create function private.sync_full_mark_bonus(p_submission uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s       public.submissions;
  v_due   timestamptz;
  v_event public.point_events;
  v_earns boolean;
begin
  select * into s from public.submissions where id = p_submission;
  select a.due_at into v_due from public.assignments a where a.id = s.assignment_id;
  v_earns := s.status = 'graded' and s.score = 100 and s.submitted_at <= v_due;

  select * into v_event from public.point_events pe
  where pe.student_id = s.student_id and pe.reason = 'assessment_full_mark' and pe.ref_id = s.id
  for update;

  if v_earns then
    if v_event.id is null then
      return private.award(s.student_id, s.school_id,
                           coalesce((private.point_rules_for(s.school_id)).full_mark, 10),
                           'assessment_full_mark', s.id);
    elsif v_event.revoked_at is not null and v_event.revoke_reason = 'regraded below full mark' then
      update public.point_events set revoked_at = null, revoked_by = null, revoke_reason = null where id = v_event.id;
      perform private.refresh_student_badges(s.student_id);
      return v_event.points;
    end if;
  elsif v_event.id is not null and v_event.revoked_at is null then
    update public.point_events
    set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = 'regraded below full mark'
    where id = v_event.id;
  end if;
  return 0;
end $$;

------------------------------------------------------------------------------------------
-- API functions (called with supabase.rpc). Errors use SQLSTATE codes the API can map:
-- 42501 forbidden, P0002 not found, 22023 invalid input, P0001 rule violation.
------------------------------------------------------------------------------------------

-- Student opens a lesson: records progress; +video/+article points the first time only.
create function public.open_lesson(p_lesson_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_school uuid := private.auth_school_id();
  v_lesson public.lessons;
  v_rules  public.point_rules;
  v_rows   int;
begin
  if private.auth_role() is distinct from 'student' then
    raise exception 'only students record lesson progress' using errcode = '42501';
  end if;

  select * into v_lesson from public.lessons l where l.id = p_lesson_id and l.is_published;
  if v_lesson.id is null or not private.has_track_access(v_lesson.track_id) then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  if v_lesson.type = 'assessment' then
    return 0;  -- completed by submitting the linked assignment
  end if;

  insert into public.lesson_progress (student_id, lesson_id, school_id)
  values (v_uid, p_lesson_id, v_school)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 0;  -- already opened before
  end if;

  v_rules := private.point_rules_for(v_school);
  return private.award(
    v_uid, v_school,
    case v_lesson.type when 'video' then coalesce(v_rules.video, 5) else coalesce(v_rules.article, 5) end,
    case v_lesson.type when 'video' then 'video_opened'::public.point_reason else 'article_opened'::public.point_reason end,
    p_lesson_id);
end $$;

-- Student submits. MCQ is auto-graded (and earns the bonus at 100% on time);
-- upload expects the file already in storage at {school}/{student}/{assignment}/...
create function public.submit_assignment(p_assignment_id uuid, p_answers jsonb default null, p_file_path text default null)
returns public.submissions
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  a         public.assignments;
  s         public.submissions;
  v_total   int;
  v_correct int;
  v_score   int;
begin
  if private.auth_role() is distinct from 'student' then
    raise exception 'only students can submit' using errcode = '42501';
  end if;

  select * into a from public.assignments x
  where x.id = p_assignment_id and x.deleted_at is null and x.published_at <= now();
  if a.id is null or not private.is_group_member(a.group_id) then
    raise exception 'assignment not found' using errcode = 'P0002';
  end if;
  if now() > a.due_at and not a.allow_late then
    raise exception 'the deadline has passed' using errcode = 'P0001';
  end if;

  select * into s from public.submissions x where x.assignment_id = a.id and x.student_id = v_uid for update;
  if s.id is not null and s.status = 'graded' then
    raise exception 'this submission has already been graded' using errcode = 'P0001';
  end if;

  if a.type = 'mcq' then
    if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
      raise exception 'answers must be an array of option indexes' using errcode = '22023';
    end if;
    with q as (
      select k.correct_index, (row_number() over (order by qq.position) - 1)::int as idx
      from public.questions qq
      left join public.question_keys k on k.question_id = qq.id
      where qq.assignment_id = a.id
    )
    select count(*),
           count(*) filter (where jsonb_typeof(p_answers -> q.idx) = 'number'
                              and (p_answers ->> q.idx)::numeric = q.correct_index)
    into v_total, v_correct
    from q;
    if v_total = 0 then
      raise exception 'this quiz has no questions yet' using errcode = 'P0001';
    end if;
    if jsonb_array_length(p_answers) <> v_total then
      raise exception 'answer every question (% expected)', v_total using errcode = '22023';
    end if;
    v_score := round(100.0 * v_correct / v_total);
  else
    if p_file_path is null
       or p_file_path not like (a.school_id::text || '/' || v_uid::text || '/' || a.id::text || '/%') then
      raise exception 'upload the file to your submission folder first' using errcode = '22023';
    end if;
  end if;

  insert into public.submissions as x (school_id, assignment_id, student_id, submitted_at, answers, file_path,
                                       status, score, graded_at)
  values (a.school_id, a.id, v_uid, now(),
          case when a.type = 'mcq' then p_answers end,
          case when a.type = 'upload' then p_file_path end,
          case when a.type = 'mcq' then 'graded'::public.submission_status else 'submitted'::public.submission_status end,
          v_score,
          case when a.type = 'mcq' then now() end)
  on conflict (assignment_id, student_id) do update
    set submitted_at = excluded.submitted_at, answers = excluded.answers, file_path = excluded.file_path,
        status = excluded.status, score = excluded.score, graded_at = excluded.graded_at
  returning * into s;

  if a.type = 'mcq' then
    perform private.sync_full_mark_bonus(s.id);
  end if;
  perform private.refresh_student_badges(v_uid);  -- submitting completes a linked assessment lesson
  return s;
end $$;

-- Instructor (of the group) or school admin grades. Returns bonus points awarded by this call.
create function public.grade_submission(p_submission_id uuid, p_score int, p_feedback text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  s       public.submissions;
  v_group uuid;
begin
  select x.* into s from public.submissions x where x.id = p_submission_id for update;
  select a.group_id into v_group from public.assignments a where a.id = s.assignment_id;
  if s.id is null or not private.is_group_staff(v_group) then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'score must be between 0 and 100' using errcode = '22023';
  end if;

  update public.submissions
  set score = p_score, status = 'graded', feedback = coalesce(p_feedback, feedback),
      graded_at = now(), graded_by = auth.uid()
  where id = s.id;

  insert into public.audit_logs (school_id, actor_id, action, entity, entity_id, data)
  values (s.school_id, auth.uid(), 'submission.graded', 'submissions', s.id::text,
          jsonb_build_object('old_score', s.score, 'new_score', p_score));

  return private.sync_full_mark_bonus(s.id);
end $$;

-- School admin (own school) or super admin adds/removes points manually, with a reason.
create function public.adjust_points(p_student_id uuid, p_delta int, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_id     uuid;
begin
  select p.school_id into v_school from public.profiles p
  where p.id = p_student_id and p.role = 'student' and p.deleted_at is null;
  if v_school is null or not (private.is_super_admin() or private.is_school_admin(v_school)) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000 then
    raise exception 'points must be a non-zero number between -1000 and 1000' using errcode = '22023';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 200 then
    raise exception 'a reason of 3 to 200 characters is required' using errcode = '22023';
  end if;

  insert into public.point_events (school_id, student_id, points, reason, note, created_by)
  values (v_school, p_student_id, p_delta, 'admin_adjustment', trim(p_reason), auth.uid())
  returning id into v_id;

  insert into public.audit_logs (school_id, actor_id, action, entity, entity_id, data)
  values (v_school, auth.uid(), 'points.adjusted', 'point_events', v_id::text,
          jsonb_build_object('student_id', p_student_id, 'delta', p_delta, 'reason', trim(p_reason)));

  perform private.refresh_student_badges(p_student_id);
  return v_id;
end $$;

-- Soft-revoke any point event (never deleted).
create function public.revoke_point_event(p_event_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e public.point_events;
begin
  select * into e from public.point_events pe where pe.id = p_event_id for update;
  if e.id is null or not (private.is_super_admin() or private.is_school_admin(e.school_id)) then
    raise exception 'point event not found' using errcode = 'P0002';
  end if;
  if e.revoked_at is not null then
    raise exception 'this event is already revoked' using errcode = 'P0001';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 200 then
    raise exception 'a reason of 3 to 200 characters is required' using errcode = '22023';
  end if;

  update public.point_events
  set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = trim(p_reason)
  where id = e.id;

  insert into public.audit_logs (school_id, actor_id, action, entity, entity_id, data)
  values (e.school_id, auth.uid(), 'points.revoked', 'point_events', e.id::text,
          jsonb_build_object('student_id', e.student_id, 'points', e.points, 'reason', trim(p_reason)));
end $$;

-- School admin sets their school's rules; super admin sets the platform default (school null) or any school's.
create function public.set_point_rules(p_full_mark int, p_video int, p_article int, p_school_id uuid default null)
returns public.point_rules
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  r        public.point_rules;
begin
  if private.is_super_admin() then
    v_school := p_school_id;
  elsif private.auth_role() = 'school_admin' then
    v_school := private.auth_school_id();
    if p_school_id is not null and p_school_id <> v_school then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_full_mark is null or p_video is null or p_article is null
     or least(p_full_mark, p_video, p_article) < 0 or greatest(p_full_mark, p_video, p_article) > 1000 then
    raise exception 'point values must be between 0 and 1000' using errcode = '22023';
  end if;

  if v_school is null then
    update public.point_rules set full_mark = p_full_mark, video = p_video, article = p_article, updated_by = auth.uid()
    where school_id is null returning * into r;
    if r.id is null then
      insert into public.point_rules (school_id, full_mark, video, article, updated_by)
      values (null, p_full_mark, p_video, p_article, auth.uid()) returning * into r;
    end if;
  else
    insert into public.point_rules (school_id, full_mark, video, article, updated_by)
    values (v_school, p_full_mark, p_video, p_article, auth.uid())
    on conflict (school_id) do update
      set full_mark = excluded.full_mark, video = excluded.video, article = excluded.article, updated_by = excluded.updated_by
    returning * into r;
  end if;

  insert into public.audit_logs (school_id, actor_id, action, entity, entity_id, data)
  values (v_school, auth.uid(), 'point_rules.updated', 'point_rules', r.id::text,
          jsonb_build_object('full_mark', p_full_mark, 'video', p_video, 'article', p_article));
  return r;
end $$;

-- Sender or group staff soft-deletes a chat message.
create function public.delete_chat_message(p_message_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.chat_messages;
begin
  select * into m from public.chat_messages c where c.id = p_message_id;
  if m.id is null or not (
       (m.sender_id = auth.uid() and private.auth_role() is not null)
       or private.is_group_staff(m.group_id)) then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  update public.chat_messages set deleted_at = now(), deleted_by = auth.uid()
  where id = m.id and deleted_at is null;
end $$;

-- Group leaderboard: first name / display name only, for members, staff and parents of members.
create function public.group_leaderboard(p_group_id uuid)
returns table (student_id uuid, name text, avatar_url text, points int, badges int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.is_group_member(p_group_id) or private.is_group_staff(p_group_id) or private.is_parent_in_group(p_group_id)) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  return query
  select gm.student_id,
         coalesce(p.display_name, split_part(p.full_name, ' ', 1)),
         p.avatar_url,
         coalesce((select greatest(0, sum(pe.points))::int from public.point_events pe
                   where pe.student_id = gm.student_id and pe.revoked_at is null), 0),
         (select count(*)::int from public.student_badges sb where sb.student_id = gm.student_id)
  from public.group_members gm
  join public.profiles p on p.id = gm.student_id and p.deleted_at is null
  where gm.group_id = p_group_id
  order by 4 desc, 2;
end $$;

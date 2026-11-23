-- 007 Row Level Security and privileges.
-- Supabase grants everything in `public` to anon/authenticated by default, so this file
-- (1) removes all anonymous access, (2) removes direct writes to server-managed tables,
-- (3) enables RLS on every table with explicit policies.
-- Wrapping helpers as (select private.fn()) lets Postgres evaluate them once per statement.

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated;
-- Helpers referenced by policies must be executable by the caller (they run as owner).
grant execute on function
  private.auth_role(), private.auth_school_id(), private.is_super_admin(), private.is_school_admin(uuid),
  private.is_group_member(uuid), private.is_group_staff(uuid), private.is_parent_of(uuid),
  private.is_parent_in_group(uuid), private.is_staff_of_student(uuid), private.can_view_student(uuid),
  private.can_view_student_text(text), private.can_see_profile(uuid, uuid, public.app_role),
  private.has_track_access(uuid), private.can_submit_to_text(text)
to authenticated;

revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Server-managed tables: no direct writes from API users (functions or service role only).
revoke insert, update, delete on
  public.schools, public.profiles, public.submissions, public.point_rules, public.point_events,
  public.lesson_progress, public.student_badges, public.audit_logs, public.notifications
from authenticated;

-- Users may edit only these columns of their own profile.
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;
-- Users may only mark their notifications as read.
grant update (read_at) on public.notifications to authenticated;
-- Chat: insert only group_id + body (sender and school are set server-side); no updates.
revoke insert, update, delete on public.chat_messages from authenticated;
grant insert (group_id, body) on public.chat_messages to authenticated;
-- schools: super_admin manages tenants directly.
grant insert, update, delete on public.schools to authenticated;

grant select on public.student_points, public.track_progress to authenticated;

grant execute on function
  public.open_lesson(uuid),
  public.submit_assignment(uuid, jsonb, text),
  public.grade_submission(uuid, int, text),
  public.adjust_points(uuid, int, text),
  public.revoke_point_event(uuid, text),
  public.set_point_rules(int, int, int, uuid),
  public.delete_chat_message(uuid),
  public.group_leaderboard(uuid)
to authenticated;

------------------------------------------------------------------------------------------
-- Enable RLS everywhere
------------------------------------------------------------------------------------------
alter table public.schools         enable row level security;
alter table public.profiles        enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.parent_links    enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.tracks          enable row level security;
alter table public.lessons         enable row level security;
alter table public.milestones      enable row level security;
alter table public.group_tracks    enable row level security;
alter table public.assignments     enable row level security;
alter table public.questions       enable row level security;
alter table public.question_keys   enable row level security;
alter table public.submissions     enable row level security;
alter table public.point_rules     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.point_events    enable row level security;
alter table public.badges          enable row level security;
alter table public.student_badges  enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.news            enable row level security;
alter table public.notifications   enable row level security;

------------------------------------------------------------------------------------------
-- Core
------------------------------------------------------------------------------------------
create policy schools_select on public.schools for select to authenticated
  using (id = (select private.auth_school_id()) or (select private.is_super_admin()));
create policy schools_insert on public.schools for insert to authenticated
  with check ((select private.is_super_admin()));
create policy schools_update on public.schools for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy schools_delete on public.schools for delete to authenticated
  using ((select private.is_super_admin()));

create policy profiles_select on public.profiles for select to authenticated
  using (private.can_see_profile(id, school_id, role));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy groups_select on public.groups for select to authenticated
  using (private.is_group_staff(id)
         or (deleted_at is null and (private.is_group_member(id) or private.is_parent_in_group(id))));
create policy groups_insert on public.groups for insert to authenticated
  with check ((select private.is_super_admin()) or private.is_school_admin(school_id));
create policy groups_update on public.groups for update to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id))
  with check ((select private.is_super_admin()) or private.is_school_admin(school_id));
create policy groups_delete on public.groups for delete to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id));

create policy group_members_select on public.group_members for select to authenticated
  using (student_id = (select auth.uid()) or private.is_group_staff(group_id) or private.is_parent_of(student_id));
create policy group_members_insert on public.group_members for insert to authenticated
  with check ((select private.is_super_admin()) or private.is_school_admin(school_id));
create policy group_members_delete on public.group_members for delete to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id));

create policy parent_links_select on public.parent_links for select to authenticated
  using (parent_id = (select auth.uid()) or student_id = (select auth.uid())
         or (select private.is_super_admin()) or private.is_school_admin(school_id));
create policy parent_links_insert on public.parent_links for insert to authenticated
  with check ((select private.is_super_admin()) or private.is_school_admin(school_id));
create policy parent_links_delete on public.parent_links for delete to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id));

create policy audit_logs_select on public.audit_logs for select to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id));

------------------------------------------------------------------------------------------
-- Curriculum (global; super_admin writes)
------------------------------------------------------------------------------------------
create policy tracks_select on public.tracks for select to authenticated
  using (private.has_track_access(id));
create policy tracks_write on public.tracks for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy lessons_select on public.lessons for select to authenticated
  using ((select private.is_super_admin()) or (is_published and private.has_track_access(track_id)));
create policy lessons_write on public.lessons for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy milestones_select on public.milestones for select to authenticated
  using (private.has_track_access(track_id));
create policy milestones_write on public.milestones for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy group_tracks_select on public.group_tracks for select to authenticated
  using (private.is_group_staff(group_id) or private.is_group_member(group_id) or private.is_parent_in_group(group_id));
create policy group_tracks_insert on public.group_tracks for insert to authenticated
  with check ((select private.is_super_admin()) or private.is_school_admin(school_id));
create policy group_tracks_delete on public.group_tracks for delete to authenticated
  using ((select private.is_super_admin()) or private.is_school_admin(school_id));

------------------------------------------------------------------------------------------
-- Assessments
------------------------------------------------------------------------------------------
create policy assignments_select on public.assignments for select to authenticated
  using (private.is_group_staff(group_id)
         or (deleted_at is null and published_at <= now()
             and (private.is_group_member(group_id) or private.is_parent_in_group(group_id))));
create policy assignments_insert on public.assignments for insert to authenticated
  with check (private.is_group_staff(group_id) and created_by = (select auth.uid()));
create policy assignments_update on public.assignments for update to authenticated
  using (private.is_group_staff(group_id)) with check (private.is_group_staff(group_id));
create policy assignments_delete on public.assignments for delete to authenticated
  using (private.is_group_staff(group_id));

create policy questions_select on public.questions for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id));
create policy questions_write on public.questions for all to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and private.is_group_staff(a.group_id)))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and private.is_group_staff(a.group_id)));

create policy question_keys_staff on public.question_keys for all to authenticated
  using (exists (select 1 from public.questions q join public.assignments a on a.id = q.assignment_id
                 where q.id = question_id and private.is_group_staff(a.group_id)))
  with check (exists (select 1 from public.questions q join public.assignments a on a.id = q.assignment_id
                      where q.id = question_id and private.is_group_staff(a.group_id)));

create policy submissions_select on public.submissions for select to authenticated
  using (student_id = (select auth.uid())
         or exists (select 1 from public.assignments a where a.id = assignment_id and private.is_group_staff(a.group_id))
         or private.is_parent_of(student_id));

------------------------------------------------------------------------------------------
-- Gamification (read-only for API users)
------------------------------------------------------------------------------------------
create policy point_rules_select on public.point_rules for select to authenticated
  using (school_id is null or school_id = (select private.auth_school_id()) or (select private.is_super_admin()));

create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (private.can_view_student(student_id));
create policy point_events_select on public.point_events for select to authenticated
  using (private.can_view_student(student_id));
create policy student_badges_select on public.student_badges for select to authenticated
  using (private.can_view_student(student_id));

create policy badges_select on public.badges for select to authenticated using (true);
create policy badges_write on public.badges for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

------------------------------------------------------------------------------------------
-- Communication
------------------------------------------------------------------------------------------
create policy chat_select on public.chat_messages for select to authenticated
  using (private.is_group_staff(group_id) or (deleted_at is null and private.is_group_member(group_id)));
create policy chat_insert on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid())
              and (private.is_group_member(group_id) or private.is_group_staff(group_id)));

create policy news_select on public.news for select to authenticated
  using ((school_id = (select private.auth_school_id()) and deleted_at is null and published_at <= now())
         or private.is_school_admin(school_id) or (select private.is_super_admin()));
create policy news_insert on public.news for insert to authenticated
  with check ((private.is_school_admin(school_id) or (select private.is_super_admin())) and author_id = (select auth.uid()));
create policy news_update on public.news for update to authenticated
  using (private.is_school_admin(school_id) or (select private.is_super_admin()))
  with check (private.is_school_admin(school_id) or (select private.is_super_admin()));
create policy news_delete on public.news for delete to authenticated
  using (private.is_school_admin(school_id) or (select private.is_super_admin()));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

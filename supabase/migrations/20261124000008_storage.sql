-- 008 Storage buckets and policies. All buckets are private; files are served with signed URLs.
-- Paths:
--   submissions/{school_id}/{student_id}/{assignment_id}/{file}
--   lesson-assets/{track_slug}/{file}          (super_admin uploads)
--   avatars/{user_id}/{file}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('submissions', 'submissions', false, 20 * 1024 * 1024,
   array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/zip', 'application/x-zip-compressed', 'text/plain']),
  ('lesson-assets', 'lesson-assets', false, 500 * 1024 * 1024, null),
  ('avatars', 'avatars', false, 2 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Submissions: a student uploads only into their own folder, for an upload assignment of their group.
-- No update/delete: a new attempt uses a new file name, so graded work cannot be swapped.
create policy "submissions: student uploads own work" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (select private.auth_role()) = 'student'
    and (storage.foldername(name))[1] = (select private.auth_school_id())::text
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and private.can_submit_to_text((storage.foldername(name))[3])
  );

create policy "submissions: student, staff and parents read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and private.can_view_student_text((storage.foldername(name))[2]));

-- Lesson assets: any active user reads (signed URLs); only super_admin writes.
create policy "lesson-assets: active users read" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-assets' and (select private.auth_role()) is not null);
create policy "lesson-assets: super admin writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-assets' and (select private.is_super_admin()));
create policy "lesson-assets: super admin updates" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-assets' and (select private.is_super_admin()));
create policy "lesson-assets: super admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-assets' and (select private.is_super_admin()));

-- Avatars: users manage their own folder; any active user can read.
create policy "avatars: active users read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (select private.auth_role()) is not null);
create policy "avatars: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

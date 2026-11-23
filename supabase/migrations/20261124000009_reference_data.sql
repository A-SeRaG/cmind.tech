-- 009 Reference data required in every environment: badge definitions and default point rules.

insert into public.badges (key, name, name_ar, description, description_ar, icon, kind, threshold, position) values
  ('first_steps',    'First Steps',    'الخطوات الأولى', 'Open your first video or article',     'افتح أول فيديو أو مقال',                    '👣', 'first_lesson',   null, 1),
  ('rising_star',    'Rising Star',    'نجم صاعد',       'Reach 50 points',                      'اجمع 50 نقطة',                              '⭐', 'points',         50,   2),
  ('bright_mind',    'Bright Mind',    'عقل مبدع',       'Reach 150 points',                     'اجمع 150 نقطة',                             '💡', 'points',         150,  3),
  ('champion',       'Champion',       'بطل',            'Reach 300 points',                     'اجمع 300 نقطة',                             '🏆', 'points',         300,  4),
  ('perfect_score',  'Perfect Score',  'العلامة الكاملة', 'Get a full mark before the deadline',  'احصل على العلامة الكاملة قبل الموعد النهائي', '💯', 'full_mark',      null, 5),
  ('track_finisher', 'Track Finisher', 'منهي المسار',    'Complete every lesson in a track',     'أكمل جميع دروس مسار',                        '🚀', 'track_complete', null, 6)
on conflict (key) do nothing;

insert into public.point_rules (school_id, full_mark, video, article)
values (null, 10, 5, 5)
on conflict do nothing;

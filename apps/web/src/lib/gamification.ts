import type { BadgeDef, PointEvent, PointRules, Track, Lesson } from '@/types/gamification';
import type { Submission } from '@/types';

export const DEFAULT_RULES: PointRules = { fullMark: 10, video: 5, article: 5 };

export const BADGES: BadgeDef[] = [
  { id: 'first_steps', icon: '👣', name: 'First Steps', nameAr: 'الخطوات الأولى', description: 'Open your first video or article', descriptionAr: 'افتح أول فيديو أو مقال' },
  { id: 'rising_star', icon: '⭐', name: 'Rising Star', nameAr: 'نجم صاعد', description: 'Reach 50 points', descriptionAr: 'اجمع 50 نقطة' },
  { id: 'bright_mind', icon: '💡', name: 'Bright Mind', nameAr: 'عقل مبدع', description: 'Reach 150 points', descriptionAr: 'اجمع 150 نقطة' },
  { id: 'champion', icon: '🏆', name: 'Champion', nameAr: 'بطل', description: 'Reach 300 points', descriptionAr: 'اجمع 300 نقطة' },
  { id: 'perfect_score', icon: '💯', name: 'Perfect Score', nameAr: 'العلامة الكاملة', description: 'Get a full mark on time', descriptionAr: 'احصل على العلامة الكاملة قبل الموعد' },
  { id: 'track_finisher', icon: '🚀', name: 'Track Finisher', nameAr: 'منهي المسار', description: 'Complete every lesson in a track', descriptionAr: 'أكمل جميع دروس مسار' },
];

export const totalPoints = (events: PointEvent[], studentId: string) =>
  Math.max(0, events.filter(e => e.studentId === studentId).reduce((s, e) => s + e.points, 0));

export const isLessonDone = (lesson: Lesson, studentId: string, events: PointEvent[], submissions: Submission[]) =>
  lesson.type === 'assessment'
    ? submissions.some(s => s.studentId === studentId && s.assignmentId === lesson.assignmentId)
    : events.some(e => e.studentId === studentId && e.refId === lesson.id &&
        (e.reason === 'video_opened' || e.reason === 'article_opened'));

export function trackProgress(track: Track, studentId: string, events: PointEvent[], submissions: Submission[]) {
  const total = track.lessons.length;
  const done = track.lessons.filter(l => isLessonDone(l, studentId, events, submissions)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function earnedBadgeIds(studentId: string, tracks: Track[], events: PointEvent[], submissions: Submission[]) {
  const mine = events.filter(e => e.studentId === studentId);
  const pts = totalPoints(events, studentId);
  const ids: string[] = [];
  if (mine.some(e => e.reason === 'video_opened' || e.reason === 'article_opened')) ids.push('first_steps');
  if (pts >= 50) ids.push('rising_star');
  if (pts >= 150) ids.push('bright_mind');
  if (pts >= 300) ids.push('champion');
  if (mine.some(e => e.reason === 'assessment_full_mark')) ids.push('perfect_score');
  if (tracks.some(t => t.lessons.length > 0 && trackProgress(t, studentId, events, submissions).pct === 100)) ids.push('track_finisher');
  return ids;
}

export const reasonKey = (r: PointEvent['reason']) => `gm.reason.${r}`;

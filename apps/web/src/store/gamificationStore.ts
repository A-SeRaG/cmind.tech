import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lesson, Milestone, PointEvent, PointRules, Track } from '@/types/gamification';
import type { Assignment, Submission } from '@/types';
import { mockTracks } from '@/data/tracks';
import { DEFAULT_RULES } from '@/lib/gamification';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const ev = (id: string, studentId: string, reason: PointEvent['reason'], refId: string, points: number, createdAt: string): PointEvent =>
  ({ id, studentId, reason, refId, points, createdAt });

const seedEvents: PointEvent[] = [
  ev('e1', '1', 'video_opened', 'pf-1', 5, '2026-09-20T10:00:00'),
  ev('e2', '1', 'article_opened', 'pf-2', 5, '2026-09-20T10:20:00'),
  ev('e3', '4', 'video_opened', 'pf-1', 5, '2026-09-18T09:00:00'),
  ev('e4', '4', 'article_opened', 'pf-2', 5, '2026-09-18T09:15:00'),
  ev('e5', '4', 'video_opened', 'pf-3', 5, '2026-09-19T09:00:00'),
  ev('e6', '4', 'article_opened', 'pf-4', 5, '2026-09-19T09:30:00'),
  ev('e7', '4', 'assessment_full_mark', '3', 10, '2026-09-21T11:00:00'),
  ev('e8', '5', 'video_opened', 'rf-1', 5, '2026-09-22T10:00:00'),
  ev('e9', '5', 'article_opened', 'rf-2', 5, '2026-09-22T10:30:00'),
  ev('e10', '6', 'video_opened', 'ai-1', 5, '2026-09-23T12:00:00'),
];

interface GamificationState {
  tracks: Track[];
  events: PointEvent[];
  rules: PointRules;
  // points
  openLesson: (studentId: string, lesson: Lesson) => number;
  awardFullMark: (submission: Submission, assignment?: Assignment) => number;
  adjustPoints: (studentId: string, points: number, note: string, adminId: string) => void;
  removeEvent: (eventId: string) => void;
  setRules: (rules: PointRules) => void;
  // curriculum
  addTrack: (t: Omit<Track, 'id' | 'lessons' | 'milestone'>) => void;
  updateTrack: (id: string, patch: Partial<Omit<Track, 'id' | 'lessons'>>) => void;
  deleteTrack: (id: string) => void;
  addLesson: (trackId: string, lesson: Omit<Lesson, 'id'>) => void;
  updateLesson: (trackId: string, lessonId: string, patch: Partial<Lesson>) => void;
  deleteLesson: (trackId: string, lessonId: string) => void;
  moveLesson: (trackId: string, lessonId: string, dir: -1 | 1) => void;
  updateMilestone: (trackId: string, milestone: Milestone) => void;
}

const mapTrack = (tracks: Track[], id: string, fn: (t: Track) => Track) =>
  tracks.map(t => (t.id === id ? fn(t) : t));

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      tracks: mockTracks,
      events: seedEvents,
      rules: DEFAULT_RULES,

      // +5 per video/article, once per student per lesson
      openLesson: (studentId, lesson) => {
        if (lesson.type === 'assessment') return 0;
        const reason = lesson.type === 'video' ? 'video_opened' : 'article_opened';
        const { events, rules } = get();
        if (events.some(e => e.studentId === studentId && e.refId === lesson.id && e.reason === reason)) return 0;
        const points = lesson.type === 'video' ? rules.video : rules.article;
        set({ events: [...events, { id: uid(), studentId, reason, refId: lesson.id, points, createdAt: new Date().toISOString() }] });
        return points;
      },

      // +10 when graded 100% and submitted on or before the deadline, once per submission
      awardFullMark: (submission, assignment) => {
        if (!assignment || submission.score !== 100) return 0;
        if (new Date(submission.submittedAt) > new Date(assignment.dueDate)) return 0;
        const { events, rules } = get();
        if (events.some(e => e.reason === 'assessment_full_mark' && e.refId === submission.id)) return 0;
        set({ events: [...events, { id: uid(), studentId: submission.studentId, reason: 'assessment_full_mark', refId: submission.id, points: rules.fullMark, createdAt: new Date().toISOString() }] });
        return rules.fullMark;
      },

      adjustPoints: (studentId, points, note, adminId) =>
        set(s => ({ events: [...s.events, { id: uid(), studentId, points, reason: 'admin_adjustment', note, createdBy: adminId, createdAt: new Date().toISOString() }] })),

      removeEvent: eventId => set(s => ({ events: s.events.filter(e => e.id !== eventId) })),
      setRules: rules => set({ rules }),

      addTrack: t => set(s => ({
        tracks: [...s.tracks, { ...t, id: uid(), lessons: [], milestone: { title: 'Final Milestone', titleAr: 'الإنجاز النهائي', description: '' } }],
      })),
      updateTrack: (id, patch) => set(s => ({ tracks: mapTrack(s.tracks, id, t => ({ ...t, ...patch })) })),
      deleteTrack: id => set(s => ({ tracks: s.tracks.filter(t => t.id !== id) })),

      addLesson: (trackId, lesson) => set(s => ({
        tracks: mapTrack(s.tracks, trackId, t => ({ ...t, lessons: [...t.lessons, { ...lesson, id: uid() }] })),
      })),
      updateLesson: (trackId, lessonId, patch) => set(s => ({
        tracks: mapTrack(s.tracks, trackId, t => ({ ...t, lessons: t.lessons.map(l => (l.id === lessonId ? { ...l, ...patch } : l)) })),
      })),
      deleteLesson: (trackId, lessonId) => set(s => ({
        tracks: mapTrack(s.tracks, trackId, t => ({ ...t, lessons: t.lessons.filter(l => l.id !== lessonId) })),
      })),
      moveLesson: (trackId, lessonId, dir) => set(s => ({
        tracks: mapTrack(s.tracks, trackId, t => {
          const i = t.lessons.findIndex(l => l.id === lessonId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= t.lessons.length) return t;
          const lessons = [...t.lessons];
          [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
          return { ...t, lessons };
        }),
      })),
      updateMilestone: (trackId, milestone) => set(s => ({ tracks: mapTrack(s.tracks, trackId, t => ({ ...t, milestone })) })),
    }),
    { name: 'cmind-gamification' }
  )
);

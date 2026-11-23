import { z } from 'zod';

/** Single source of truth for the points rules (mirrored by SQL functions in supabase/migrations). */
export const DEFAULT_POINT_RULES = { fullMark: 10, video: 5, article: 5 } as const;

export const pointRulesSchema = z.object({
  fullMark: z.number().int().min(0).max(1000),
  video: z.number().int().min(0).max(1000),
  article: z.number().int().min(0).max(1000),
});
export type PointRules = z.infer<typeof pointRulesSchema>;

export const adjustPointsSchema = z.object({
  studentId: z.string().uuid(),
  delta: z.number().int().refine(n => n !== 0, 'delta must be non-zero').refine(n => Math.abs(n) <= 1000),
  reason: z.string().trim().min(3).max(200),
});

/** Full mark = 100% and submitted on or before the deadline. */
export const earnsFullMarkBonus = (score: number, submittedAt: Date, dueDate: Date): boolean =>
  score === 100 && submittedAt.getTime() <= dueDate.getTime();

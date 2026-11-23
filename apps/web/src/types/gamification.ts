export type LessonType = 'video' | 'article' | 'assessment';

export interface Lesson {
  id: string;
  title: string;
  titleAr: string;
  type: LessonType;
  durationMin: number;
  summary: string;
  body?: string; // article text, paragraphs separated by blank lines
  videoUrl?: string; // optional embed/stream URL for videos
  assignmentId?: string; // assessment lessons link to an assignment
}

export interface Milestone {
  title: string;
  titleAr: string;
  description: string;
}

export interface Track {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  level: string;
  description: string;
  lessons: Lesson[];
  milestone: Milestone;
}

export type PointReason =
  | 'assessment_full_mark'
  | 'video_opened'
  | 'article_opened'
  | 'admin_adjustment';

export interface PointEvent {
  id: string;
  studentId: string;
  points: number; // negative allowed for admin adjustments
  reason: PointReason;
  refId?: string; // lessonId or submissionId (used to prevent double awards)
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PointRules {
  fullMark: number;
  video: number;
  article: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
}

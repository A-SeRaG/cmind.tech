// User roles
export type UserRole = 'student' | 'teacher' | 'admin';

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  avatar?: string;
  groupId?: string;
}

// School type
export interface School {
  id: string;
  name: string;
  domain: string;
}

// Group/Class type
export interface Group {
  id: string;
  name: string;
  grade: string;
  schoolId: string;
  teacherId: string;
  memberCount?: number;
}

// Assignment types
export type AssignmentType = 'mcq' | 'upload';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  groupId: string;
  teacherId: string;
  dueDate: string;
  type: AssignmentType;
  createdAt: string;
  questionCount?: number;
}

// MCQ Question type
export interface Question {
  id: string;
  assignmentId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

// Submission types
export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  submittedAt: string;
  score?: number;
  fileUrl?: string;
  status: 'submitted' | 'graded' | 'pending';
}

export interface SubmissionAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  chosenOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
}

// Chat message type
export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  sentAt: string;
}

// News type
export interface NewsItem {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  authorId: string;
  authorName?: string;
  publishedAt: string;
}

// Notification type
export interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Stats for dashboards
export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalGroups?: number;
  totalAssignments?: number;
  pendingSubmissions?: number;
  recentActivity?: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'submission' | 'assignment' | 'grade' | 'news';
  description: string;
  timestamp: string;
  userName?: string;
}

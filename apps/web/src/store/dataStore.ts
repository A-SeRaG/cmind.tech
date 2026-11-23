import { create } from 'zustand';
import type { 
  Assignment, 
  Group, 
  NewsItem, 
  ChatMessage, 
  Submission,
  User,
  DashboardStats 
} from '@/types';

interface DataState {
  // Data
  assignments: Assignment[];
  groups: Group[];
  news: NewsItem[];
  messages: ChatMessage[];
  submissions: Submission[];
  users: User[];
  
  // Actions
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  addSubmission: (submission: Submission) => void;
  gradeSubmission: (id: string, score: number) => Submission | undefined;
  addNews: (newsItem: NewsItem) => void;
  deleteNews: (id: string) => void;
  getStats: () => DashboardStats;
}

// Mock data
const trackAssessment = (id: string, title: string, due: string): Assignment => ({
  id, title, description: 'Track assessment. A full mark before the deadline earns bonus points.',
  groupId: 'group1', teacherId: '2', dueDate: due, type: 'mcq', createdAt: '2026-09-15T10:00:00', questionCount: 10
});

const mockAssignments: Assignment[] = [
  trackAssessment('a-scratch', 'Scratch Basics Quiz', '2026-12-15T23:59:00'),
  trackAssessment('a-robotics', 'Robotics Fundamentals Quiz', '2026-12-20T23:59:00'),
  trackAssessment('a-ai', 'AI Concepts Quiz', '2026-12-25T23:59:00'),
  trackAssessment('a-chess', 'Chess Tactics Quiz', '2026-12-30T23:59:00'),
  {
    id: '1',
    title: 'Mathematics Quiz - Algebra',
    description: 'Test your knowledge of algebraic equations and expressions.',
    groupId: 'group1',
    teacherId: '2',
    dueDate: '2026-04-20T23:59:00',
    type: 'mcq',
    createdAt: '2026-04-10T10:00:00',
    questionCount: 10
  },
  {
    id: '2',
    title: 'Science Project - Ecosystems',
    description: 'Submit a PDF report on local ecosystems.',
    groupId: 'group1',
    teacherId: '2',
    dueDate: '2026-04-25T23:59:00',
    type: 'upload',
    createdAt: '2026-04-12T14:00:00'
  },
  {
    id: '3',
    title: 'History Essay - Ancient Civilizations',
    description: 'Write an essay about ancient Egyptian civilization.',
    groupId: 'group1',
    teacherId: '2',
    dueDate: '2026-04-30T23:59:00',
    type: 'upload',
    createdAt: '2026-04-13T09:00:00'
  }
];

const mockGroups: Group[] = [
  {
    id: 'group1',
    name: 'Grade 10A',
    grade: '10',
    schoolId: 'school1',
    teacherId: '2',
    memberCount: 25
  },
  {
    id: 'group2',
    name: 'Grade 10B',
    grade: '10',
    schoolId: 'school1',
    teacherId: '2',
    memberCount: 22
  },
  {
    id: 'group3',
    name: 'Grade 11A',
    grade: '11',
    schoolId: 'school1',
    teacherId: '2',
    memberCount: 28
  }
];

const mockNews: NewsItem[] = [
  {
    id: '1',
    schoolId: 'school1',
    title: 'School Annual Sports Day',
    body: 'Join us for the annual sports day on April 25th. All students are encouraged to participate in various sports activities.',
    authorId: '3',
    authorName: 'Mr. Administrator',
    publishedAt: '2026-04-10T08:00:00'
  },
  {
    id: '2',
    schoolId: 'school1',
    title: 'Midterm Exam Schedule Released',
    body: 'The midterm examination schedule has been released. Please check your student portal for detailed information.',
    authorId: '3',
    authorName: 'Mr. Administrator',
    publishedAt: '2026-04-12T10:30:00'
  },
  {
    id: '3',
    schoolId: 'school1',
    title: 'New Library Books Available',
    body: 'We have added 500 new books to our school library. Come and explore the new collection!',
    authorId: '2',
    authorName: 'Ms. Saber Mohammed',
    publishedAt: '2026-04-13T14:00:00'
  }
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    groupId: 'group1',
    senderId: '2',
    senderName: 'Ms. Saber Mohammed',
    senderRole: 'teacher',
    message: 'Hello everyone! Don\'t forget about the math quiz tomorrow.',
    sentAt: '2026-04-13T09:00:00'
  },
  {
    id: '2',
    groupId: 'group1',
    senderId: '1',
    senderName: 'Ahmed Serag ',
    senderRole: 'student',
    message: 'Thank you for the reminder, Ms. Saber!',
    sentAt: '2026-04-13T09:15:00'
  },
  {
    id: '3',
    groupId: 'group1',
    senderId: '2',
    senderName: 'Ms. Saber Mohammed',
    senderRole: 'teacher',
    message: 'You\'re welcome! Good luck with your preparation.',
    sentAt: '2026-04-13T09:20:00'
  }
];

const mockSubmissions: Submission[] = [
  {
    id: '1',
    assignmentId: '1',
    studentId: '1',
    studentName: 'Ahmed Serag ',
    submittedAt: '2026-04-19T15:30:00',
    score: 85,
    status: 'graded'
  },
  {
    id: '2',
    assignmentId: '2',
    studentId: '1',
    studentName: 'Ahmed Serag ',
    submittedAt: '2026-04-24T10:00:00',
    status: 'pending'
  },
  { id: '3', assignmentId: 'a-scratch', studentId: '4', studentName: 'Youssef Hany', submittedAt: '2026-09-21T10:45:00', score: 100, status: 'graded' },
  { id: '4', assignmentId: 'a-scratch', studentId: '5', studentName: 'Nour Ibrahim', submittedAt: '2026-09-22T12:00:00', score: 90, status: 'graded' }
];

const student = (id: string, name: string, email: string): User => ({
  id, name, email, role: 'student', schoolId: 'school1', groupId: 'group1',
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
});

const mockUsers: User[] = [
  student('4', 'Youssef Hany', 'youssef@cmind.tech'),
  student('5', 'Nour Ibrahim', 'nour@cmind.tech'),
  student('6', 'Karim Mostafa', 'karim@cmind.tech'),
  {
    id: '1',
    name: 'Ahmed Serag',
    email: 'student@cmind.tech',
    role: 'student',
    schoolId: 'school1',
    groupId: 'group1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed'
  },
  {
    id: '2',
    name: 'Ms. Saber Mohammed',
    email: 'teacher@cmind.tech',
    role: 'teacher',
    schoolId: 'school1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saber'
  },
  {
    id: '3',
    name: 'Mr. Administrator',
    email: 'admin@cmind.tech',
    role: 'admin',
    schoolId: 'school1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  }
];

export const useDataStore = create<DataState>()((set, get) => ({
  assignments: mockAssignments,
  groups: mockGroups,
  news: mockNews,
  messages: mockMessages,
  submissions: mockSubmissions,
  users: mockUsers,

  addAssignment: (assignment) => {
    set((state) => ({
      assignments: [assignment, ...state.assignments]
    }));
  },

  updateAssignment: (id, updatedAssignment) => {
    set((state) => ({
      assignments: state.assignments.map(a => 
        a.id === id ? { ...a, ...updatedAssignment } : a
      )
    }));
  },

  deleteAssignment: (id) => {
    set((state) => ({
      assignments: state.assignments.filter(a => a.id !== id)
    }));
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  addSubmission: (submission) => {
    set((state) => ({
      submissions: [submission, ...state.submissions]
    }));
  },

  gradeSubmission: (id, score) => {
    const value = Math.min(100, Math.max(0, Math.round(score)));
    let graded: Submission | undefined;
    set((state) => ({
      submissions: state.submissions.map(sub => {
        if (sub.id !== id) return sub;
        graded = { ...sub, score: value, status: 'graded' };
        return graded;
      })
    }));
    return graded;
  },

  addNews: (newsItem) => {
    set((state) => ({
      news: [newsItem, ...state.news]
    }));
  },

  deleteNews: (id) => {
    set((state) => ({
      news: state.news.filter(n => n.id !== id)
    }));
  },

  getStats: () => {
    const state = get();
    return {
      totalStudents: state.users.filter(u => u.role === 'student').length,
      totalTeachers: state.users.filter(u => u.role === 'teacher').length,
      totalGroups: state.groups.length,
      totalAssignments: state.assignments.length,
      pendingSubmissions: state.submissions.filter(s => s.status === 'pending').length
    };
  }
}));

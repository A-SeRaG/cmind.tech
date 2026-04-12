import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

// Mock users for demo
const mockUsers: Record<string, User & { password: string }> = {
  'student@cmind.tech': {
    id: '1',
    name: 'Ahmed Serag',
    email: 'student@cmind.tech',
    password: 'student123',
    role: 'student',
    schoolId: 'school1',
    groupId: 'group1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed'
  },
  'teacher@cmind.tech': {
    id: '2',
    name: 'Ms. Saber Mohammed',
    email: 'teacher@cmind.tech',
    password: 'teacher123',
    role: 'teacher',
    schoolId: 'school1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saber'
  },
  'admin@cmind.tech': {
    id: '3',
    name: 'Mr. Administrator',
    email: 'admin@cmind.tech',
    password: 'admin123',
    role: 'admin',
    schoolId: 'school1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = mockUsers[email.toLowerCase()];
        
        if (mockUser && mockUser.password === password) {
          const { password: _, ...userWithoutPassword } = mockUser;
          set({ 
            user: userWithoutPassword, 
            isAuthenticated: true,
            isLoading: false 
          });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      }
    }),
    {
      name: 'cmind-auth-storage'
    }
  )
);

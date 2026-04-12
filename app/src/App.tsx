import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Assignments } from '@/pages/Assignments';
import { Submissions } from '@/pages/Submissions';
import { Chat } from '@/pages/Chat';
import { News } from '@/pages/News';
import { Users } from '@/pages/Users';
import { Groups } from '@/pages/Groups';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/sonner';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Role-based route guard
function RoleRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: ('student' | 'teacher' | 'admin')[];
}) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { isRTL } = useLanguageStore();

  useEffect(() => {
    // Apply RTL direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }, [isRTL]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="chat" element={<Chat />} />
        <Route path="news" element={<News />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        
        {/* Admin only routes */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <Users />
            </RoleRoute>
          }
        />
        <Route
          path="groups"
          element={
            <RoleRoute allowedRoles={['teacher', 'admin']}>
              <Groups />
            </RoleRoute>
          }
        />
        <Route
          path="schools"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div className="p-8 text-center text-muted-foreground">
                <h2 className="text-2xl font-bold mb-4">Schools Management</h2>
                <p>This feature is coming soon.</p>
              </div>
            </RoleRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <div className="p-8 text-center text-muted-foreground">
              <h2 className="text-2xl font-bold mb-4">Notifications</h2>
              <p>You have no new notifications.</p>
            </div>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;

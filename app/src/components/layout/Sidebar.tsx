import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  MessageSquare,
  Newspaper,
  Users,
  GraduationCap,
  School,
  Settings,
  UserCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ('student' | 'teacher' | 'admin')[];
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { isRTL } = useLanguageStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      label: t('navigation.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.assignments'),
      href: '/assignments',
      icon: BookOpen,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.submissions'),
      href: '/submissions',
      icon: FileText,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.chat'),
      href: '/chat',
      icon: MessageSquare,
      roles: ['student', 'teacher']
    },
    {
      label: t('navigation.news'),
      href: '/news',
      icon: Newspaper,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.users'),
      href: '/users',
      icon: Users,
      roles: ['admin']
    },
    {
      label: t('navigation.groups'),
      href: '/groups',
      icon: GraduationCap,
      roles: ['teacher', 'admin']
    },
    {
      label: t('navigation.schools'),
      href: '/schools',
      icon: School,
      roles: ['admin']
    },
    {
      label: t('navigation.notifications'),
      href: '/notifications',
      icon: Bell,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.profile'),
      href: '/profile',
      icon: UserCircle,
      roles: ['student', 'teacher', 'admin']
    },
    {
      label: t('navigation.settings'),
      href: '/settings',
      icon: Settings,
      roles: ['student', 'teacher', 'admin']
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">{t('app.name')}</span>
              <span className="text-xs text-muted-foreground">{t('app.tagline')}</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:flex"
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary-foreground")} />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse button at bottom */}
      {isCollapsed && (
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="w-full"
          >
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={isRTL ? 'right' : 'left'} className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

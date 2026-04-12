import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLanguageStore } from '@/store/languageStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  LogOut,
  User,
  Settings,
  Bell,
  ChevronDown
} from 'lucide-react';

export function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { language, toggleLanguage } = useLanguageStore();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b bg-card">
      {/* Left side - Mobile menu button */}
      <div className="flex items-center gap-4">
        {/* Mobile menu is handled in Sidebar */}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              {theme === 'light' && <Sun className="w-5 h-5" />}
              {theme === 'dark' && <Moon className="w-5 h-5" />}
              {theme === 'system' && <Monitor className="w-5 h-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('settings.theme')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="w-4 h-4 mr-2" />
              {t('settings.light')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="w-4 h-4 mr-2" />
              {t('settings.dark')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="w-4 h-4 mr-2" />
              {t('settings.system')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="hidden sm:flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase">{language}</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>{t('navigation.notifications')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-2 text-center text-sm text-muted-foreground">
              {t('common.noData')}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-tight">{user?.name}</span>
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {t(`roles.${user?.role}`)}
                </Badge>
              </div>
              <ChevronDown className="w-4 h-4 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile" className="flex items-center cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                {t('navigation.profile')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                {t('navigation.settings')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Mobile-only theme and language */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="sm:hidden">
                <Sun className="w-4 h-4 mr-2" />
                {t('settings.theme')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  {t('settings.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  {t('settings.dark')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={toggleLanguage} className="sm:hidden">
              <Globe className="w-4 h-4 mr-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

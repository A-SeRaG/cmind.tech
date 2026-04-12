import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLanguageStore } from '@/store/languageStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Sun, Moon, Globe, Loader2 } from 'lucide-react';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const { language, toggleLanguage, isRTL } = useLanguageStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('student');

  // Pre-fill credentials based on selected role
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError('');
    if (value === 'student') {
      setEmail('student@cmind.com');
      setPassword('student123');
    } else if (value === 'teacher') {
      setEmail('teacher@cmind.com');
      setPassword('teacher123');
    } else if (value === 'admin') {
      setEmail('admin@cmind.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError(t('auth.invalidCredentials'));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Theme & Language Toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        >
          {resolvedTheme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleLanguage}>
          <Globe className="w-4 h-4 mr-2" />
          <span className="uppercase">{language}</span>
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg mb-4">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">{t('app.name')}</h1>
          <p className="text-muted-foreground">{t('app.tagline')}</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('auth.welcome')}</CardTitle>
            <CardDescription>{t('auth.signIn')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="student">{t('roles.student')}</TabsTrigger>
                <TabsTrigger value="teacher">{t('roles.teacher')}</TabsTrigger>
                <TabsTrigger value="admin">{t('roles.admin')}</TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <LoginForm 
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  error={error}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                />
              </TabsContent>

              <TabsContent value="teacher">
                <LoginForm 
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  error={error}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                />
              </TabsContent>

              <TabsContent value="admin">
                <LoginForm 
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  error={error}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                />
              </TabsContent>
            </Tabs>

            {/* Demo credentials hint */}
            <div className="mt-6 p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Student:</strong> student@cmind.com / student123</p>
                <p><strong>Teacher:</strong> teacher@cmind.com / teacher123</p>
                <p><strong>Admin:</strong> admin@cmind.com / admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function LoginForm({ email, setEmail, password, setPassword, error, isLoading, onSubmit }: LoginFormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t('common.email')}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('common.password')}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('common.login')
        )}
      </Button>
    </form>
  );
}

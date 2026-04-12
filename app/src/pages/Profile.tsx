import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Mail, User, Shield, GraduationCap, School, BookOpen, CheckCircle } from 'lucide-react';

export function Profile() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, submissions, assignments } = useDataStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const userGroup = groups.find(g => g.id === user?.groupId);
  const userSubmissions = submissions.filter(s => s.studentId === user?.id);
  const completedAssignments = userSubmissions.length;
  const totalAssignments = assignments.filter(a => a.groupId === user?.groupId).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'teacher':
        return <GraduationCap className="w-4 h-4" />;
      case 'student':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const handleSave = () => {
    // In a real app, this would update the user profile
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.personalInfo')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-4xl">{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getRoleIcon(user?.role || '')}
                  {t(`roles.${user?.role}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>

              {userGroup && (
                <div className="mt-4 p-3 bg-muted rounded-lg w-full">
                  <div className="flex items-center gap-2 text-sm">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('users.group')}:</span>
                    <span className="font-medium">{userGroup.name}</span>
                  </div>
                </div>
              )}

              {/* Stats for students */}
              {user?.role === 'student' && (
                <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{completedAssignments}</p>
                    <p className="text-xs text-muted-foreground">{t('stats.completedAssignments')}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{totalAssignments - completedAssignments}</p>
                    <p className="text-xs text-muted-foreground">{t('stats.pendingSubmissions')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('profile.personalInfo')}</CardTitle>
            <CardDescription>{t('profile.updateProfile')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">{t('profile.personalInfo')}</TabsTrigger>
                <TabsTrigger value="password">{t('profile.changePassword')}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('users.name')}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email}
                      disabled
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('users.role')}</Label>
                    <Input
                      id="role"
                      value={t(`roles.${user?.role}`)}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school">{t('users.school')}</Label>
                    <Input
                      id="school"
                      value="CMind School"
                      disabled
                    />
                  </div>
                </div>

                {userGroup && (
                  <div className="space-y-2">
                    <Label htmlFor="group">{t('users.group')}</Label>
                    <Input
                      id="group"
                      value={userGroup.name}
                      disabled
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSave}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('common.save')}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      {t('common.edit')}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="password" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('profile.currentPassword')}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button>
                    {t('profile.changePassword')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      {user?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userSubmissions.slice(0, 5).map((submission) => {
                const assignment = assignments.find(a => a.id === submission.assignmentId);
                return (
                  <div key={submission.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('submissions.submittedAt')}: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {submission.score !== undefined && (
                        <p className="text-lg font-bold">{submission.score}%</p>
                      )}
                      <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                        {t(`assignments.${submission.status}`)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {userSubmissions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('common.noData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { assignments, news, submissions, groups, getStats } = useDataStore();

  const stats = getStats();
  const role = user?.role;

  // Filter data based on role
  const myAssignments = role === 'student' 
    ? assignments.filter(a => a.groupId === user?.groupId)
    : assignments;

  const mySubmissions = role === 'student'
    ? submissions.filter(s => s.studentId === user?.id)
    : submissions;

  const pendingAssignments = myAssignments.filter(a => {
    const submission = submissions.find(s => s.assignmentId === a.id && s.studentId === user?.id);
    return !submission && new Date(a.dueDate) > new Date();
  });

  const recentNews = news.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome')}, {user?.name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.overview')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {role === 'admin' && (
          <>
            <StatCard
              title={t('stats.totalStudents')}
              value={stats.totalStudents || 0}
              icon={Users}
              trend="+5%"
              trendUp={true}
            />
            <StatCard
              title={t('stats.totalTeachers')}
              value={stats.totalTeachers || 0}
              icon={GraduationCap}
              trend="+2%"
              trendUp={true}
            />
            <StatCard
              title={t('stats.totalGroups')}
              value={stats.totalGroups || 0}
              icon={BookOpen}
              trend="0%"
              trendUp={true}
            />
            <StatCard
              title={t('stats.totalAssignments')}
              value={stats.totalAssignments || 0}
              icon={FileText}
              trend="+12%"
              trendUp={true}
            />
          </>
        )}

        {role === 'teacher' && (
          <>
            <StatCard
              title={t('stats.totalGroups')}
              value={groups.length}
              icon={BookOpen}
            />
            <StatCard
              title={t('stats.totalAssignments')}
              value={assignments.length}
              icon={FileText}
            />
            <StatCard
              title={t('stats.pendingSubmissions')}
              value={submissions.filter(s => s.status === 'pending').length}
              icon={Clock}
              alert={submissions.filter(s => s.status === 'pending').length > 0}
            />
            <StatCard
              title={t('stats.averageScore')}
              value="78%"
              icon={TrendingUp}
              trend="+5%"
              trendUp={true}
            />
          </>
        )}

        {role === 'student' && (
          <>
            <StatCard
              title={t('stats.totalAssignments')}
              value={myAssignments.length}
              icon={BookOpen}
            />
            <StatCard
              title={t('stats.completedAssignments')}
              value={mySubmissions.length}
              icon={CheckCircle}
            />
            <StatCard
              title={t('stats.pendingSubmissions')}
              value={pendingAssignments.length}
              icon={Clock}
              alert={pendingAssignments.length > 0}
            />
            <StatCard
              title={t('stats.averageScore')}
              value="85%"
              icon={TrendingUp}
              trend="+3%"
              trendUp={true}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.upcomingAssignments')}</CardTitle>
              <CardDescription>
                {role === 'student' ? t('assignments.pending') : t('dashboard.overview')}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/assignments">
                {t('common.view')} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {myAssignments.slice(0, 5).map((assignment) => {
                  const submission = submissions.find(s => 
                    s.assignmentId === assignment.id && s.studentId === user?.id
                  );
                  const isOverdue = new Date(assignment.dueDate) < new Date();
                  
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{assignment.title}</h4>
                          <Badge variant={assignment.type === 'mcq' ? 'default' : 'secondary'}>
                            {t(`assignments.${assignment.type}`)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {assignment.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}
                          </span>
                          {submission && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {t('assignments.submitted')}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOverdue && !submission && (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                {myAssignments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('assignments.noAssignments')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent News */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('news.title')}</CardTitle>
              <CardDescription>{t('dashboard.recentActivity')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/news">
                {t('common.view')} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {recentNews.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium line-clamp-1">{item.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.publishedAt), 'MMM dd')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{t('news.publishedBy')}:</span>
                      <span className="font-medium">{item.authorName}</span>
                    </div>
                  </div>
                ))}
                {recentNews.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('news.noNews')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Role-specific sections */}
      {role === 'student' && mySubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('submissions.mySubmissions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mySubmissions.slice(0, 3).map((submission) => {
                const assignment = assignments.find(a => a.id === submission.assignmentId);
                return (
                  <div key={submission.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <h4 className="font-medium">{assignment?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('submissions.submittedAt')}: {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                      </p>
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
}

function StatCard({ title, value, icon: Icon, trend, trendUp, alert }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
            {trend && (
              <p className={`text-sm mt-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                {trendUp ? '↑' : '↓'} {trend} from last month
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${alert ? 'bg-red-100 dark:bg-red-900' : 'bg-primary/10'}`}>
            <Icon className={`w-6 h-6 ${alert ? 'text-red-500' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

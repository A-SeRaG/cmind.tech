import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Calendar, FileText, CheckCircle, Clock, ArrowRight, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { Assignment, AssignmentType } from '@/types';

export function Assignments() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { assignments, submissions, addAssignment, deleteAssignment } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const role = user?.role;
  const isTeacherOrAdmin = role === 'teacher' || role === 'admin';

  // Filter assignments based on role and search
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (role === 'student') {
      return a.groupId === user?.groupId && matchesSearch;
    }
    return matchesSearch;
  });

  const activeAssignments = filteredAssignments.filter(a => new Date(a.dueDate) > new Date());
  const pastAssignments = filteredAssignments.filter(a => new Date(a.dueDate) <= new Date());

  const handleCreateAssignment = (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    addAssignment(newAssignment);
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('assignments.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacherOrAdmin ? t('dashboard.overview') : t('assignments.pending')}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('assignments.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <CreateAssignmentForm 
                onSubmit={handleCreateAssignment}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Assignments Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            {t('assignments.pending')} ({activeAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            {t('assignments.graded')} ({pastAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                role={role}
                submission={submissions.find(s => s.assignmentId === assignment.id && s.studentId === user?.id)}
                onDelete={isTeacherOrAdmin ? () => deleteAssignment(assignment.id) : undefined}
              />
            ))}
          </div>
          {activeAssignments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('assignments.noAssignments')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                role={role}
                submission={submissions.find(s => s.assignmentId === assignment.id && s.studentId === user?.id)}
                onDelete={isTeacherOrAdmin ? () => deleteAssignment(assignment.id) : undefined}
              />
            ))}
          </div>
          {pastAssignments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('assignments.noAssignments')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AssignmentCardProps {
  assignment: Assignment;
  role?: string;
  submission?: { id: string; assignmentId: string; studentId: string; submittedAt: string; score?: number; fileUrl?: string; status: 'submitted' | 'graded' | 'pending' };
  onDelete?: () => void;
}

function AssignmentCard({ assignment, role, submission, onDelete }: AssignmentCardProps) {
  const { t } = useTranslation();
  const { groups } = useDataStore();
  const isStudent = role === 'student';
  const isOverdue = new Date(assignment.dueDate) < new Date();
  const group = groups.find(g => g.id === assignment.groupId);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={assignment.type === 'mcq' ? 'default' : 'secondary'}>
                {t(`assignments.${assignment.type}`)}
              </Badge>
              {submission && (
                <Badge variant="outline" className="text-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('assignments.submitted')}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-1">{assignment.title}</CardTitle>
          </div>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {assignment.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className={isOverdue ? 'text-red-500' : ''}>
              {t('assignments.dueDate')}: {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}
            </span>
          </div>
          {group && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{group.name}</span>
            </div>
          )}
          {assignment.questionCount && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{assignment.questionCount} {t('assignments.questions')}</span>
            </div>
          )}
        </div>

        {isStudent && !submission && (
          <Button className="w-full mt-auto" asChild>
            <a href={`/assignments/${assignment.id}`}>
              {t('assignments.startAssignment')} <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        )}

        {isStudent && submission && (
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('assignments.score')}:</span>
              <span className="text-lg font-bold">
                {submission.score !== undefined ? `${submission.score}%` : t('assignments.pending')}
              </span>
            </div>
          </div>
        )}

        {!isStudent && (
          <div className="mt-auto pt-4 border-t flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a href={`/assignments/${assignment.id}`}>
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={`/submissions?assignment=${assignment.id}`}>
                <FileText className="w-4 h-4 mr-2" />
                {t('navigation.submissions')}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CreateAssignmentFormProps {
  onSubmit: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function CreateAssignmentForm({ onSubmit, onCancel }: CreateAssignmentFormProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const groups = useDataStore(s => s.groups);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<AssignmentType>('mcq');
  const [groupId, setGroupId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      dueDate,
      type,
      groupId,
      teacherId: user?.id || '',
      questionCount: type === 'mcq' ? 10 : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{t('assignments.create')}</DialogTitle>
        <DialogDescription>{t('dashboard.overview')}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t('assignments.assignmentTitle')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter assignment title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t('assignments.description')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter assignment description"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">{t('assignments.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssignmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">{t('assignments.mcq')}</SelectItem>
                <SelectItem value="upload">{t('assignments.upload')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">{t('navigation.groups')}</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">{t('assignments.dueDate')}</Label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.create')}</Button>
      </DialogFooter>
    </form>
  );
}

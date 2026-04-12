import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Users, GraduationCap, BookOpen, Trash2, Edit, UserPlus } from 'lucide-react';
import type { Group } from '@/types';

export function Groups() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, users } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  // Filter groups
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeacherName = (teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    return teacher?.name || 'Unknown';
  };

  const getGroupStudents = (groupId: string) => {
    return users.filter(u => u.role === 'student' && u.groupId === groupId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('groups.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
        </div>
        {(isAdmin || isTeacher) && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('groups.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <CreateGroupForm 
                onSubmit={() => setIsCreateDialogOpen(false)}
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

      {/* Groups Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{t('groups.grade')} {group.grade}</Badge>
                  </div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                {(isAdmin || isTeacher) && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-3 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{t('groups.teacher')}: {getTeacherName(group.teacherId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{group.memberCount} {t('groups.students')}</span>
                </div>
              </div>

              {/* Student List Preview */}
              <div className="flex-1 border rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t('groups.students')}
                </p>
                <div className="space-y-1">
                  {getGroupStudents(group.id).slice(0, 3).map((student) => (
                    <div key={student.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        {student.name.charAt(0)}
                      </div>
                      <span className="truncate">{student.name}</span>
                    </div>
                  ))}
                  {getGroupStudents(group.id).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{getGroupStudents(group.id).length - 3} more
                    </p>
                  )}
                  {getGroupStudents(group.id).length === 0 && (
                    <p className="text-xs text-muted-foreground">{t('users.noUsers')}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedGroup(group)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('groups.addMembers')}
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`/assignments?group=${group.id}`}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('navigation.assignments')}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('groups.noGroups')}</p>
        </div>
      )}

      {/* Add Members Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-2xl">
          {selectedGroup && (
            <>
              <DialogHeader>
                <DialogTitle>{t('groups.addMembers')} - {selectedGroup.name}</DialogTitle>
                <DialogDescription>
                  Add students to this group
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('users.name')}</TableHead>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(u => u.role === 'student' && u.groupId !== selectedGroup.id)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              {t('common.add')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CreateGroupFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

function CreateGroupForm({ onSubmit, onCancel }: CreateGroupFormProps) {
  const { t } = useTranslation();
  const { users } = useDataStore();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const teachers = users.filter(u => u.role === 'teacher');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{t('groups.create')}</DialogTitle>
        <DialogDescription>{t('dashboard.overview')}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('groups.groupName')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grade 10A"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grade">{t('groups.grade')}</Label>
          <Input
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g., 10"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher">{t('groups.teacher')}</Label>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Select teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

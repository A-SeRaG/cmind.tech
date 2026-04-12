import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, CheckCircle, Clock, Download, Eye, Star } from 'lucide-react';
import { format } from 'date-fns';

export function Submissions() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { submissions, assignments, users } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<typeof submissions[0] | null>(null);
  const [gradeInput, setGradeInput] = useState('');

  const role = user?.role;
  const isStudent = role === 'student';

  // Filter submissions based on role
  const filteredSubmissions = submissions.filter(s => {
    const assignment = assignments.find(a => a.id === s.assignmentId);
    const student = users.find(u => u.id === s.studentId);
    
    const matchesSearch = 
      assignment?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (isStudent) {
      return s.studentId === user?.id && matchesSearch;
    }
    return matchesSearch;
  });

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending');
  const gradedSubmissions = filteredSubmissions.filter(s => s.status === 'graded');

  const handleGrade = () => {
    if (selectedSubmission && gradeInput) {
      // In a real app, this would update the submission
      setSelectedSubmission(null);
      setGradeInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('submissions.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {isStudent ? t('submissions.mySubmissions') : t('submissions.studentSubmissions')}
        </p>
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

      {/* Submissions Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            {t('common.filter')} ({filteredSubmissions.length})
          </TabsTrigger>
          {!isStudent && (
            <TabsTrigger value="pending">
              {t('assignments.pending')} ({pendingSubmissions.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="graded">
            {t('assignments.graded')} ({gradedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <SubmissionsTable 
            submissions={filteredSubmissions}
            isStudent={isStudent}
            onView={setSelectedSubmission}
          />
        </TabsContent>

        {!isStudent && (
          <TabsContent value="pending" className="mt-6">
            <SubmissionsTable 
              submissions={pendingSubmissions}
              isStudent={isStudent}
              onView={setSelectedSubmission}
            />
          </TabsContent>
        )}

        <TabsContent value="graded" className="mt-6">
          <SubmissionsTable 
            submissions={gradedSubmissions}
            isStudent={isStudent}
            onView={setSelectedSubmission}
          />
        </TabsContent>
      </Tabs>

      {/* Grade Dialog */}
      <Dialog open={!!selectedSubmission && !isStudent} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>{t('submissions.grade')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedSubmission.fileUrl && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Submitted File</p>
                          <p className="text-sm text-muted-foreground">PDF Document</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        {t('common.download')}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="grade">{t('submissions.enterGrade')}</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    placeholder="Enter score (0-100)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleGrade}>
                  <Star className="w-4 h-4 mr-2" />
                  {t('submissions.grade')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SubmissionType = { id: string; assignmentId: string; studentId: string; submittedAt: string; score?: number; fileUrl?: string; status: 'submitted' | 'graded' | 'pending' };

interface SubmissionsTableProps {
  submissions: SubmissionType[];
  isStudent: boolean;
  onView: (submission: SubmissionType) => void;
}

function SubmissionsTable({ submissions, isStudent, onView }: SubmissionsTableProps) {
  const { t } = useTranslation();
  const { assignments, users } = useDataStore();

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('assignments.assignmentTitle')}</TableHead>
              {!isStudent && <TableHead>{t('users.name')}</TableHead>}
              <TableHead>{t('submissions.submittedAt')}</TableHead>
              <TableHead>{t('assignments.status')}</TableHead>
              <TableHead>{t('assignments.score')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => {
              const assignment = assignments.find(a => a.id === submission.assignmentId);
              const student = users.find(u => u.id === submission.studentId);

              return (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{assignment?.title}</TableCell>
                  {!isStudent && <TableCell>{student?.name}</TableCell>}
                  <TableCell>
                    {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                      {submission.status === 'graded' ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> {t('assignments.graded')}</>
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" /> {t('assignments.pending')}</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {submission.score !== undefined ? (
                      <span className="font-bold">{submission.score}%</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {submission.fileUrl && (
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {!isStudent && submission.status === 'pending' && (
                        <Button size="sm" onClick={() => onView(submission)}>
                          <Star className="w-4 h-4 mr-1" />
                          {t('submissions.grade')}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

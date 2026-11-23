import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { useLanguageStore } from '@/store/languageStore';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Lesson, LessonType, Milestone, Track } from '@/types/gamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Editing =
  | { kind: 'track'; track?: Track }
  | { kind: 'lesson'; trackId: string; lesson?: Lesson }
  | { kind: 'milestone'; trackId: string; milestone: Milestone };

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1"><Label>{label}</Label>{children}</div>
);

export function CurriculumAdmin() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const assignments = useDataStore(s => s.assignments);
  const g = useGamificationStore();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const ar = language === 'ar';

  const start = (e: Editing, values: Record<string, string>) => { setForm(values); setEditing(e); };
  const set = (k: string) => (v: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: typeof v === 'string' ? v : v.target.value }));

  const save = () => {
    if (!editing) return;
    if (editing.kind === 'track') {
      const data = { name: form.name, nameAr: form.nameAr || form.name, icon: form.icon || '📘', level: form.level || 'Level 1', description: form.description || '' };
      if (!data.name) return;
      editing.track ? g.updateTrack(editing.track.id, data) : g.addTrack(data);
    } else if (editing.kind === 'lesson') {
      const type = (form.type || 'video') as LessonType;
      if (!form.title || (type === 'assessment' && !form.assignmentId)) return;
      const data: Omit<Lesson, 'id'> = {
        title: form.title, titleAr: form.titleAr || form.title, type,
        durationMin: Number(form.durationMin) || 5, summary: form.summary || '',
        body: type === 'article' ? form.body : undefined,
        videoUrl: type === 'video' ? form.videoUrl || undefined : undefined,
        assignmentId: type === 'assessment' ? form.assignmentId : undefined,
      };
      editing.lesson ? g.updateLesson(editing.trackId, editing.lesson.id, data) : g.addLesson(editing.trackId, data);
    } else {
      g.updateMilestone(editing.trackId, { title: form.title, titleAr: form.titleAr || form.title, description: form.description || '' });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t('navigation.curriculum')}</h1>
          <p className="text-muted-foreground mt-1">{t('gm.curriculumSubtitle')}</p>
        </div>
        <Button onClick={() => start({ kind: 'track' }, {})}><Plus className="w-4 h-4 me-2" />{t('gm.newTrack')}</Button>
      </div>

      {g.tracks.map(track => (
        <Card key={track.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{track.icon}</span>{ar ? track.nameAr : track.name}
              <Badge variant="outline">{track.level}</Badge>
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => start({ kind: 'track', track }, { name: track.name, nameAr: track.nameAr, icon: track.icon, level: track.level, description: track.description })}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-red-500"
                onClick={() => confirm(t('gm.confirmDeleteTrack')) && g.deleteTrack(track.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {track.lessons.map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 border rounded-md p-2 text-sm">
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => g.moveLesson(track.id, l.id, -1)} className="disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button disabled={i === track.lessons.length - 1} onClick={() => g.moveLesson(track.id, l.id, 1)} className="disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <Badge variant="secondary">{t(`gm.type.${l.type}`)}</Badge>
                <span className="flex-1 truncate">{ar ? l.titleAr : l.title}</span>
                <span className="text-muted-foreground">{l.durationMin} {t('gm.min')}</span>
                <Button variant="ghost" size="icon" onClick={() => start({ kind: 'lesson', trackId: track.id, lesson: l }, { ...l, durationMin: String(l.durationMin), body: l.body ?? '', videoUrl: l.videoUrl ?? '', assignmentId: l.assignmentId ?? '' })}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => g.deleteLesson(track.id, l.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => start({ kind: 'lesson', trackId: track.id }, { type: 'video' })}>
                <Plus className="w-4 h-4 me-1" />{t('gm.addLesson')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => start({ kind: 'milestone', trackId: track.id, milestone: track.milestone }, { ...track.milestone })}>
                <Flag className="w-4 h-4 me-1" />{ar ? track.milestone.titleAr : track.milestone.title}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t(`gm.edit.${editing?.kind ?? 'track'}`)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editing?.kind === 'track' && (<>
              <Field label={t('gm.nameEn')}><Input value={form.name ?? ''} onChange={set('name')} /></Field>
              <Field label={t('gm.nameAr')}><Input dir="rtl" value={form.nameAr ?? ''} onChange={set('nameAr')} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('gm.icon')}><Input value={form.icon ?? ''} onChange={set('icon')} /></Field>
                <Field label={t('gm.level')}><Input value={form.level ?? ''} onChange={set('level')} /></Field>
              </div>
              <Field label={t('gm.description')}><Textarea value={form.description ?? ''} onChange={set('description')} /></Field>
            </>)}
            {editing?.kind === 'lesson' && (<>
              <Field label={t('gm.lessonType')}>
                <Select value={form.type ?? 'video'} onValueChange={set('type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['video', 'article', 'assessment'] as const).map(x => <SelectItem key={x} value={x}>{t(`gm.type.${x}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('gm.nameEn')}><Input value={form.title ?? ''} onChange={set('title')} /></Field>
              <Field label={t('gm.nameAr')}><Input dir="rtl" value={form.titleAr ?? ''} onChange={set('titleAr')} /></Field>
              <Field label={t('gm.duration')}><Input type="number" value={form.durationMin ?? ''} onChange={set('durationMin')} /></Field>
              <Field label={t('gm.summary')}><Input value={form.summary ?? ''} onChange={set('summary')} /></Field>
              {form.type === 'article' && <Field label={t('gm.articleBody')}><Textarea rows={6} value={form.body ?? ''} onChange={set('body')} /></Field>}
              {form.type === 'video' && <Field label={t('gm.videoUrl')}><Input placeholder="https://" value={form.videoUrl ?? ''} onChange={set('videoUrl')} /></Field>}
              {form.type === 'assessment' && (
                <Field label={t('gm.linkedAssessment')}>
                  <Select value={form.assignmentId ?? ''} onValueChange={set('assignmentId')}>
                    <SelectTrigger><SelectValue placeholder={t('gm.selectAssessment')} /></SelectTrigger>
                    <SelectContent>{assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
            </>)}
            {editing?.kind === 'milestone' && (<>
              <Field label={t('gm.nameEn')}><Input value={form.title ?? ''} onChange={set('title')} /></Field>
              <Field label={t('gm.nameAr')}><Input dir="rtl" value={form.titleAr ?? ''} onChange={set('titleAr')} /></Field>
              <Field label={t('gm.description')}><Textarea value={form.description ?? ''} onChange={set('description')} /></Field>
            </>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

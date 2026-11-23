import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useLanguageStore } from '@/store/languageStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { isLessonDone, trackProgress } from '@/lib/gamification';
import type { Lesson } from '@/types/gamification';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle2, ClipboardCheck, FileText, Flag, Lock, Play } from 'lucide-react';

const icons = { video: Play, article: FileText, assessment: ClipboardCheck };

export function TrackDetail() {
  const { t } = useTranslation();
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const submissions = useDataStore(s => s.submissions);
  const { tracks, events, rules, openLesson } = useGamificationStore();
  const [open, setOpen] = useState<Lesson | null>(null);

  const track = tracks.find(x => x.id === trackId);
  if (!track) return <p className="p-8 text-center text-muted-foreground">{t('common.noData')}</p>;

  const isStudent = user?.role === 'student';
  const ar = language === 'ar';
  const p = isStudent && user ? trackProgress(track, user.id, events, submissions) : null;
  const rewardFor = (l: Lesson) => (l.type === 'video' ? rules.video : l.type === 'article' ? rules.article : rules.fullMark);

  const handleOpen = (lesson: Lesson) => {
    if (lesson.type === 'assessment') return navigate('/assignments');
    setOpen(lesson);
    if (isStudent && user) {
      const earned = openLesson(user.id, lesson);
      if (earned > 0) toast.success(t('gm.pointsEarned', { points: earned }));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/tracks"><ArrowLeft className="w-4 h-4 me-2" />{t('common.back')}</Link>
      </Button>

      <div className="flex items-center gap-4">
        <span className="text-5xl">{track.icon}</span>
        <div>
          <h1 className="text-3xl font-bold">{ar ? track.nameAr : track.name}</h1>
          <p className="text-muted-foreground">{track.description}</p>
        </div>
      </div>

      {p && (
        <div className="space-y-1">
          <Progress value={p.pct} />
          <p className="text-sm text-muted-foreground">{p.done}/{p.total} {t('gm.completed')} ({p.pct}%)</p>
        </div>
      )}

      <div className="space-y-3">
        {track.lessons.map((lesson, i) => {
          const Icon = icons[lesson.type];
          const done = isStudent && user ? isLessonDone(lesson, user.id, events, submissions) : false;
          return (
            <Card key={lesson.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpen(lesson)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{i + 1}. {ar ? lesson.titleAr : lesson.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`gm.type.${lesson.type}`)} · {lesson.durationMin} {t('gm.min')}
                  </p>
                </div>
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Badge variant="secondary">+{rewardFor(lesson)} {t('gm.pts')}</Badge>}
              </CardContent>
            </Card>
          );
        })}

        {(() => {
          const unlocked = p?.pct === 100;
          return (
            <Card className={unlocked ? 'border-primary' : 'opacity-80'}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  {unlocked ? <Flag className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{ar ? track.milestone.titleAr : track.milestone.title}</p>
                  <p className="text-sm text-muted-foreground">{track.milestone.description}</p>
                </div>
                {isStudent && <Badge variant={unlocked ? 'default' : 'outline'}>{unlocked ? t('gm.unlocked') : t('gm.locked')}</Badge>}
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{ar ? open.titleAr : open.title}</DialogTitle>
                <DialogDescription>{open.summary}</DialogDescription>
              </DialogHeader>
              {open.type === 'video' ? (
                open.videoUrl ? (
                  <iframe src={open.videoUrl} title={open.title} className="w-full aspect-video rounded-lg" allowFullScreen />
                ) : (
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-muted flex flex-col items-center justify-center gap-2">
                    <Play className="w-12 h-12 text-primary" />
                    <p className="text-sm text-muted-foreground">{t('gm.videoPlaceholder')} · {open.durationMin} {t('gm.min')}</p>
                  </div>
                )
              ) : (
                <div className="space-y-3 text-sm leading-7">
                  {(open.body ?? '').split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

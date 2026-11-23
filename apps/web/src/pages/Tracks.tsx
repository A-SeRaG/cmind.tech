import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useLanguageStore } from '@/store/languageStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { trackProgress, totalPoints } from '@/lib/gamification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Flag, ArrowRight } from 'lucide-react';

export function Tracks() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const submissions = useDataStore(s => s.submissions);
  const { tracks, events } = useGamificationStore();
  const isStudent = user?.role === 'student';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t('navigation.tracks')}</h1>
          <p className="text-muted-foreground mt-1">{t('gm.tracksSubtitle')}</p>
        </div>
        {isStudent && user && (
          <Badge variant="secondary" className="text-base px-3 py-1">
            ⭐ {totalPoints(events, user.id)} {t('gm.points')}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tracks.map(track => {
          const p = isStudent && user ? trackProgress(track, user.id, events, submissions) : null;
          return (
            <Card key={track.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{track.icon}</span>
                  <Badge variant="outline">{track.level}</Badge>
                </div>
                <CardTitle className="mt-2">{language === 'ar' ? track.nameAr : track.name}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{track.lessons.length} {t('gm.lessons')}</span>
                  <span>·</span>
                  <Flag className="w-4 h-4" />
                  <span>{t('gm.finalMilestone')}</span>
                </div>
                {p && (
                  <div className="space-y-1">
                    <Progress value={p.pct} />
                    <p className="text-xs text-muted-foreground">{p.done}/{p.total} {t('gm.completed')}</p>
                  </div>
                )}
                <Button className="w-full" asChild>
                  <Link to={`/tracks/${track.id}`}>
                    {t('gm.openTrack')} <ArrowRight className="w-4 h-4 ms-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

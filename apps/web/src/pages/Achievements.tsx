import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useLanguageStore } from '@/store/languageStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { BADGES, earnedBadgeIds, reasonKey, totalPoints } from '@/lib/gamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function Achievements() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const { users, submissions } = useDataStore();
  const { tracks, events } = useGamificationStore();
  const isStudent = user?.role === 'student';
  const ar = language === 'ar';

  const board = users
    .filter(u => u.role === 'student')
    .map(u => ({ u, pts: totalPoints(events, u.id), badges: earnedBadgeIds(u.id, tracks, events, submissions).length }))
    .sort((a, b) => b.pts - a.pts);

  const Leaderboard = (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead>{t('gm.points')}</TableHead>
              <TableHead>{t('gm.badges')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {board.map((r, i) => (
              <TableRow key={r.u.id} className={r.u.id === user?.id ? 'bg-primary/5' : ''}>
                <TableCell>{['🥇', '🥈', '🥉'][i] ?? i + 1}</TableCell>
                <TableCell className="font-medium">{r.u.name}</TableCell>
                <TableCell>{r.pts}</TableCell>
                <TableCell>{r.badges}/{BADGES.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (!isStudent || !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('gm.leaderboard')}</h1>
        {Leaderboard}
      </div>
    );
  }

  const mine = events.filter(e => e.studentId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const earned = earnedBadgeIds(user.id, tracks, events, submissions);
  const rank = board.findIndex(r => r.u.id === user.id) + 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('navigation.achievements')}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t('gm.totalPoints')}</CardTitle></CardHeader>
          <CardContent className="text-4xl font-bold">⭐ {totalPoints(events, user.id)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t('gm.rank')}</CardTitle></CardHeader>
          <CardContent className="text-4xl font-bold">#{rank}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t('gm.badges')}</CardTitle></CardHeader>
          <CardContent className="text-4xl font-bold">{earned.length}/{BADGES.length}</CardContent></Card>
      </div>

      <Tabs defaultValue="badges">
        <TabsList>
          <TabsTrigger value="badges">{t('gm.badges')}</TabsTrigger>
          <TabsTrigger value="history">{t('gm.history')}</TabsTrigger>
          <TabsTrigger value="board">{t('gm.leaderboard')}</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BADGES.map(b => {
              const has = earned.includes(b.id);
              return (
                <Card key={b.id} className={has ? 'border-primary' : 'opacity-50 grayscale'}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-4xl">{b.icon}</span>
                    <div>
                      <p className="font-semibold">{ar ? b.nameAr : b.name}</p>
                      <p className="text-sm text-muted-foreground">{ar ? b.descriptionAr : b.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('gm.date')}</TableHead><TableHead>{t('gm.reasonLabel')}</TableHead><TableHead>{t('gm.points')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {mine.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
                {mine.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{t(reasonKey(e.reason))}{e.note ? ` – ${e.note}` : ''}</TableCell>
                    <TableCell><Badge variant={e.points >= 0 ? 'default' : 'destructive'}>{e.points > 0 ? '+' : ''}{e.points}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="board" className="mt-6">{Leaderboard}</TabsContent>
      </Tabs>
    </div>
  );
}

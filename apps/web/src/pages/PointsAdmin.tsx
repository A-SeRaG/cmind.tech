import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Search, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { BADGES, earnedBadgeIds, reasonKey, totalPoints } from '@/lib/gamification';
import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function PointsAdmin() {
  const { t } = useTranslation();
  const { user: admin } = useAuthStore();
  const { users, submissions } = useDataStore();
  const { tracks, events, rules, setRules, adjustPoints, removeEvent } = useGamificationStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState(rules);

  const students = users.filter(u => u.role === 'student' && u.name.toLowerCase().includes(query.toLowerCase()));
  const allStudents = users.filter(u => u.role === 'student');
  const awardedTotal = allStudents.reduce((s, u) => s + totalPoints(events, u.id), 0);

  const saveRules = () => {
    const v = { fullMark: Number(draft.fullMark), video: Number(draft.video), article: Number(draft.article) };
    if (Object.values(v).some(n => Number.isNaN(n) || n < 0)) return toast.error(t('gm.invalidNumber'));
    setRules(v);
    toast.success(t('common.success'));
  };

  const applyAdjustment = () => {
    const n = Number(delta);
    if (!selected || !admin || !n || !note.trim()) return toast.error(t('gm.adjustRequired'));
    adjustPoints(selected.id, Math.round(n), note.trim(), admin.id);
    setDelta(''); setNote('');
    toast.success(t('common.success'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('navigation.pointsAdmin')}</h1>
        <p className="text-muted-foreground mt-1">{t('gm.adminSubtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t('stats.totalStudents')}</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{allStudents.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t('gm.totalAwarded')}</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{awardedTotal}</CardContent></Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">{t('gm.rules')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            {(['fullMark', 'video', 'article'] as const).map(k => (
              <div key={k} className="space-y-1 w-24">
                <Label className="text-xs">{t(`gm.rule.${k}`)}</Label>
                <Input type="number" min={0} value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value as unknown as number })} />
              </div>
            ))}
            <Button onClick={saveRules}>{t('common.save')}</Button>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="ps-9" placeholder={t('common.search')} value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t('users.name')}</TableHead><TableHead>{t('gm.points')}</TableHead>
            <TableHead>{t('gm.badges')}</TableHead><TableHead className="text-end">{t('gm.manage')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {students.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>⭐ {totalPoints(events, u.id)}</TableCell>
                <TableCell>{earnedBadgeIds(u.id, tracks, events, submissions).length}/{BADGES.length}</TableCell>
                <TableCell className="text-end"><Button size="sm" onClick={() => setSelected(u)}>{t('gm.manage')}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name} – ⭐ {totalPoints(events, selected.id)}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="adjust">
                <TabsList>
                  <TabsTrigger value="adjust">{t('gm.adjust')}</TabsTrigger>
                  <TabsTrigger value="log">{t('gm.history')}</TabsTrigger>
                </TabsList>
                <TabsContent value="adjust" className="space-y-3 mt-4">
                  <div className="space-y-1">
                    <Label>{t('gm.adjustAmount')}</Label>
                    <Input type="number" placeholder="+10 / -5" value={delta} onChange={e => setDelta(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('gm.adjustReason')}</Label>
                    <Input value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={applyAdjustment}>{t('gm.applyAdjustment')}</Button>
                </TabsContent>
                <TabsContent value="log" className="mt-4 space-y-2">
                  {events.filter(e => e.studentId === selected.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(e => (
                    <div key={e.id} className="flex items-center gap-3 border rounded-md p-2 text-sm">
                      <Badge variant={e.points >= 0 ? 'default' : 'destructive'}>{e.points > 0 ? '+' : ''}{e.points}</Badge>
                      <div className="flex-1">
                        <p>{t(reasonKey(e.reason))}{e.note ? ` – ${e.note}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.createdAt), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeEvent(e.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

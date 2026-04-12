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
import { Plus, Search, Calendar, User, Trash2, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import type { NewsItem } from '@/types';

export function News() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { news, addNews, deleteNews } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const isAdmin = user?.role === 'admin';

  const filteredNews = news.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNews = (title: string, body: string) => {
    if (!user) return;
    
    const newNews: NewsItem = {
      id: Date.now().toString(),
      schoolId: user.schoolId,
      title,
      body,
      authorId: user.id,
      authorName: user.name,
      publishedAt: new Date().toISOString()
    };
    
    addNews(newNews);
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('news.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.recentActivity')}</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('news.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateNewsForm 
                onSubmit={handleCreateNews}
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

      {/* News Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredNews.map((item) => (
          <NewsCard
            key={item.id}
            news={item}
            isAdmin={isAdmin}
            onDelete={() => deleteNews(item.id)}
            onClick={() => setSelectedNews(item)}
          />
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('news.noNews')}</p>
        </div>
      )}

      {/* News Detail Dialog */}
      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNews && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedNews.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedNews.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedNews.publishedAt), 'MMM dd, yyyy')}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedNews.body}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface NewsCardProps {
  news: NewsItem;
  isAdmin: boolean;
  onDelete: () => void;
  onClick: () => void;
}

function NewsCard({ news, isAdmin, onDelete, onClick }: NewsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{t('news.title')}</Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">{news.title}</CardTitle>
          </div>
          {isAdmin && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <CardDescription className="line-clamp-3 flex-1">
          {news.body}
        </CardDescription>
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {news.authorName}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {format(new Date(news.publishedAt), 'MMM dd')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateNewsFormProps {
  onSubmit: (title: string, body: string) => void;
  onCancel: () => void;
}

function CreateNewsForm({ onSubmit, onCancel }: CreateNewsFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title, body);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{t('news.create')}</DialogTitle>
        <DialogDescription>{t('dashboard.overview')}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t('assignments.assignmentTitle')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter news title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">{t('assignments.description')}</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter news content"
            rows={6}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('news.publish')}</Button>
      </DialogFooter>
    </form>
  );
}

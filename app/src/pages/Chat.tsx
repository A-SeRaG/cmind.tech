import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import type { ChatMessage } from '@/types';

export function Chat() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, messages, addMessage } = useDataStore();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userGroup = groups.find(g => g.id === user?.groupId);
  const availableGroups = user?.role === 'teacher' ? groups : 
    userGroup ? [userGroup] : [];

  const currentGroup = availableGroups.find(g => g.id === selectedGroupId) || availableGroups[0];
  
  const groupMessages = messages.filter(m => m.groupId === currentGroup?.id);

  useEffect(() => {
    if (availableGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [availableGroups, selectedGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentGroup || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      groupId: currentGroup.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      message: messageInput.trim(),
      sentAt: new Date().toISOString()
    };

    addMessage(newMessage);
    setMessageInput('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  // Group messages by date
  const groupedMessages = groupMessages.reduce((groups, message) => {
    const date = formatMessageDate(message.sentAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('chat.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('chat.groupChat')}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Groups List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t('navigation.groups')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-1 p-4">
                {availableGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      currentGroup?.id === group.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <span className="font-medium">
                        {group.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs opacity-70">
                        {group.memberCount} {t('groups.students')}
                      </p>
                    </div>
                  </button>
                ))}
                {availableGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('groups.noGroups')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          {currentGroup ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <span className="font-medium">
                        {currentGroup.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{currentGroup.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {groupMessages.length} {t('chat.title').toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  {Object.entries(groupedMessages).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <span className="text-2xl">💬</span>
                      </div>
                      <p>{t('chat.noMessages')}</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedMessages).map(([date, msgs]) => (
                        <div key={date} className="space-y-4">
                          {/* Date Divider */}
                          <div className="flex items-center justify-center">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              {date}
                            </span>
                          </div>

                          {/* Messages */}
                          {msgs.map((message) => {
                            const isOwnMessage = message.senderId === user?.id;
                            
                            return (
                              <div
                                key={message.id}
                                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                              >
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderName}`} />
                                  <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">{message.senderName}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {t(`roles.${message.senderRole}`)}
                                    </Badge>
                                  </div>
                                  <div
                                    className={`px-4 py-2 rounded-2xl ${
                                      isOwnMessage
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-muted rounded-tl-sm'
                                    }`}
                                  >
                                    <p className="text-sm">{message.message}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {formatMessageTime(message.sentAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <CardContent className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={t('chat.typeMessage')}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button type="submit" size="icon" disabled={!messageInput.trim()}>
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">👋</span>
              </div>
              <p>Select a group to start chatting</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

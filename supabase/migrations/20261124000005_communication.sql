-- 005 Communication: group chat (moderated), school news, notifications.

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body        text not null check (length(trim(body)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles (id) on delete set null
);
comment on column public.chat_messages.deleted_at is 'Soft delete by the sender or group staff; hidden from students.';
create index chat_messages_group_idx on public.chat_messages (group_id, created_at desc);

create table public.news (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  author_id     uuid references public.profiles (id) on delete set null default auth.uid(),
  title         text not null check (length(trim(title)) between 2 and 200),
  body          text not null check (length(body) <= 20000),
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index news_school_idx on public.news (school_id, published_at desc) where deleted_at is null;

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references public.schools (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (length(type) <= 60),
  payload     jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.notifications is 'Created by the API/functions; users can only mark their own as read.';
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create trigger news_updated_at before update on public.news for each row execute function private.set_updated_at();

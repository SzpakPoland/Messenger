'use client';

import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import Avatar from '@/components/ui/Avatar';
import type { Conversation, User } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  currentUser: User;
  active?: boolean;
  onClick: () => void;
}

const getOtherUser = (conv: Conversation, me: User): User | null => {
  if (conv.type !== 'private') return null;
  return conv.participants.find((p) => p._id !== me._id) ?? null;
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'wczoraj';
  if (isThisWeek(d)) return format(d, 'EEE', { locale: pl });
  return format(d, 'dd.MM.yy');
};

export default function ConversationItem({
  conversation,
  currentUser,
  active,
  onClick,
}: ConversationItemProps) {
  const other = getOtherUser(conversation, currentUser);
  const isGroup = conversation.type === 'group';

  const displayName = isGroup
    ? conversation.name || 'Grupa'
    : other?.username || 'Nieznany';

  const avatarSrc = isGroup ? conversation.avatar : other?.avatar;
  const isOnline = !isGroup && (other?.isOnline ?? false);

  const lastMsg = conversation.lastMessage;
  const lastMsgText = lastMsg
    ? lastMsg.type === 'image'
      ? '📷 Zdjęcie'
      : lastMsg.type === 'file'
      ? `📎 ${lastMsg.fileName || 'Plik'}`
      : lastMsg.content
    : 'Brak wiadomości';

  const isLastMine = lastMsg?.sender?._id === currentUser._id;

  return (
    <div
      onClick={onClick}
      className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
    >
      <Avatar
        src={avatarSrc}
        name={displayName}
        size="md"
        online={!isGroup ? isOnline : undefined}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">{displayName}</span>
          {lastMsg && (
            <span className="text-[11px] text-slate-500 flex-shrink-0 ml-1">
              {formatTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isLastMine && <span className="text-[11px] text-slate-500">Ty:</span>}
          <span className="text-xs text-slate-400 truncate">{lastMsgText}</span>
        </div>
      </div>
    </div>
  );
}

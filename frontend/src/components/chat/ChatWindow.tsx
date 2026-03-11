'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  UserPlus,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { conversationsAPI, messagesAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import type { Conversation, Message, User } from '@/types';
import Modal from '@/components/ui/Modal';

interface ChatWindowProps {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket, emitTyping, emitStopTyping, joinConversations } = useSocket();
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldScroll = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    setLoadingConv(true);
    conversationsAPI
      .getOne(conversationId)
      .then((res) => setConversation(res.data.conversation))
      .catch(() => toast.error('Nie można załadować rozmowy'))
      .finally(() => setLoadingConv(false));
  }, [conversationId]);

  useEffect(() => {
    setLoadingMsgs(true);
    setMessages([]);
    setPage(1);
    shouldScroll.current = true;
    messagesAPI
      .getMessages(conversationId, 1)
      .then((res) => {
        setMessages(res.data.messages);
        setHasMore(res.data.pagination.hasMore);
      })
      .catch(() => toast.error('Nie można załadować wiadomości'))
      .finally(() => setLoadingMsgs(false));  }, [conversationId]);

  useEffect(() => {
    joinConversations([conversationId]);
  }, [conversationId, joinConversations]);

  useEffect(() => {
    if (shouldScroll.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      if (msg.conversation !== conversationId) return;
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      shouldScroll.current = true;
    };

    const onTyping = ({ userId, username }: { userId: string; username: string }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
    };

    const onStopTyping = ({ userId }: { userId: string }) => {
      if (userId === user?._id) return;
      setConversation((c) => {
        if (!c) return c;
        const u = c.participants.find((p) => p._id === userId);
        if (u) setTypingUsers((prev) => prev.filter((n) => n !== u.username));
        return c;
      });
    };

    const onUserStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setConversation((c) => {
        if (!c) return c;
        return {
          ...c,
          participants: c.participants.map((p) =>
            p._id === userId ? { ...p, isOnline } : p
          ),
        };
      });
    };

    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);
    socket.on('user_status', onUserStatus);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
      socket.off('user_status', onUserStatus);
    };
  }, [socket, conversationId, user?._id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleSend = async (content: string, file?: File) => {
    if (!content && !file) return;
    try {
      if (file) {
        const fd = new FormData();
        if (content) fd.append('content', content);
        fd.append('file', file);
        await messagesAPI.sendMessage(conversationId, fd);
      } else {
        await messagesAPI.sendMessage(conversationId, { content });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Błąd wysyłania';
      toast.error(msg);
      throw err;
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    shouldScroll.current = false;
    try {
      const res = await messagesAPI.getMessages(conversationId, nextPage);
      setMessages((prev) => [...res.data.messages, ...prev]);
      setHasMore(res.data.pagination.hasMore);
      setPage(nextPage);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    try {
      await conversationsAPI.removeMember(conversationId, user._id);
      toast.success('Opuszczono grupę');
      router.push('/chat');
    } catch {
      toast.error('Błąd');
    }
  };

  if (!user) return null;

  if (loadingConv) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-900">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-900">
        <p className="text-slate-400">Rozmowa nie znaleziona</p>
      </div>
    );
  }

  const isGroup = conversation.type === 'group';
  const otherUser = !isGroup ? conversation.participants.find((p) => p._id !== user._id) : null;
  const displayName = isGroup ? conversation.name || 'Grupa' : otherUser?.username || 'Użytkownik';
  const avatarSrc = isGroup ? conversation.avatar : otherUser?.avatar;
  const isOnline = !isGroup && (otherUser?.isOnline ?? false);
  const isAdmin = isGroup && conversation.admins?.some((a) => a._id === user._id);

  return (
    <div className="flex flex-col h-full bg-surface-900 flex-1 min-w-0">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-surface-900/95 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={() => router.push('/chat')}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Avatar
          src={avatarSrc}
          name={displayName}
          size="md"
          online={!isGroup ? isOnline : undefined}
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white text-sm truncate">{displayName}</h2>
          {isGroup ? (
            <p className="text-xs text-slate-400">
              {conversation.participants.length} uczestników
            </p>
          ) : (
            <p className={`text-xs ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 w-48 bg-surface-800 border border-white/[0.08] rounded-xl shadow-xl z-20 overflow-hidden animate-slide-up">
              {isGroup && isAdmin && (
                <button
                  onClick={() => { setShowAddMember(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Dodaj uczestnika
                </button>
              )}
              {isGroup && (
                <button
                  onClick={() => { handleLeaveGroup(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Opuść grupę
                </button>
              )}
              {!isGroup && (
                <div className="px-4 py-2.5 text-xs text-slate-500">
                  Rozmowa prywatna
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-brand-400 hover:text-brand-300 bg-brand-600/10 px-4 py-1.5 rounded-full transition-colors"
            >
              {loadingMore ? 'Ładuję…' : 'Załaduj starsze'}
            </button>
          </div>
        )}

        {loadingMsgs && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingMsgs && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-slate-300 font-medium">
              {isGroup ? `Witaj w grupie ${displayName}!` : `Zacznij rozmowę z ${displayName}`}
            </p>
            <p className="text-slate-500 text-sm mt-1">Napisz pierwszą wiadomość</p>
          </div>
        )}

        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const isGrouped =
            prev &&
            prev.sender._id === message.sender._id &&
            new Date(message.createdAt).getTime() -
              new Date(prev.createdAt).getTime() <
              5 * 60 * 1000;
          const showAvatar = !isGrouped;
          return (
            <MessageBubble
              key={message._id}
              message={message}
              currentUser={user}
              showAvatar={showAvatar}
              isGrouped={!!isGrouped}
            />
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="w-7 h-7 flex-shrink-0" />
            <div className="message-bubble-other flex items-center gap-1.5 py-3 px-4">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="text-xs text-slate-400 ml-1">
                {typingUsers.join(', ')} pisze…
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={() => emitTyping(conversationId)}
        onStopTyping={() => emitStopTyping(conversationId)}
      />

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        conversationId={conversationId}
        existingMembers={conversation.participants.map((p) => p._id)}
        onAdded={(updatedConv) => setConversation(updatedConv)}
      />
    </div>
  );
}


interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  existingMembers: string[];
  onAdded: (conv: Conversation) => void;
}

function AddMemberModal({
  isOpen,
  onClose,
  conversationId,
  existingMembers,
  onAdded,
}: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await usersAPI.search(q);
        setResults(res.data.users.filter((u: User) => !existingMembers.includes(u._id)));
      } catch { /* ignore */ }
    }, 300);
  };

  const handleAdd = async (userId: string) => {
    setLoadingId(userId);
    try {
      const res = await conversationsAPI.addMember(conversationId, userId);
      onAdded(res.data.conversation);
      toast.success('Dodano do grupy');
      onClose();
    } catch {
      toast.error('Błąd');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj uczestnika">
      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Szukaj użytkownika…"
          className="input-field"
          autoFocus
        />
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u._id}
              onClick={() => handleAdd(u._id)}
              disabled={loadingId === u._id}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-60"
            >
              <Avatar src={u.avatar} name={u.username} size="sm" online={u.isOnline} />
              <div className="flex-1 text-left">
                <p className="text-sm text-white">{u.username}</p>
              </div>
              {loadingId === u._id && (
                <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}



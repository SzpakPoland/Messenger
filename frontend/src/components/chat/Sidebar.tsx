'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  Users,
  MessageSquarePlus,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import ConversationItem from './ConversationItem';
import CreateGroupModal from './CreateGroupModal';
import NewConversationModal from './NewConversationModal';
import { conversationsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import type { Conversation, User } from '@/types';

interface SidebarProps {
  onConversationSelect?: (id: string) => void;
}

export default function Sidebar({ onConversationSelect }: SidebarProps) {
  const { user, logout } = useAuth();
  const { socket, isConnected, joinConversations } = useSocket();
  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await conversationsAPI.getAll();
      setConversations(res.data.conversations);
      joinConversations(res.data.conversations.map((c: Conversation) => c._id));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [joinConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const onConvUpdated = (updated: Conversation) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === updated._id);
        if (exists) {
          return [updated, ...prev.filter((c) => c._id !== updated._id)];
        }
        return [updated, ...prev];
      });
    };

    const onUserStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) =>
            p._id === userId ? { ...p, isOnline } : p
          ),
        }))
      );
    };

    socket.on('conversation_updated', onConvUpdated);
    socket.on('user_status', onUserStatus);

    return () => {
      socket.off('conversation_updated', onConvUpdated);
      socket.off('user_status', onUserStatus);
    };
  }, [socket]);

  const handleNewConversation = (conv: Conversation) => {
    setConversations((prev) => {
      if (prev.find((c) => c._id === conv._id)) return prev;
      return [conv, ...prev];
    });
    joinConversations([conv._id]);
    router.push(`/chat/${conv._id}`);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Wylogowano');
  };

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (c.type === 'group') return (c.name || '').toLowerCase().includes(q);
    const other = c.participants.find((p) => p._id !== user?._id);
    return other?.username.toLowerCase().includes(q) ?? false;
  });

  const activeId = pathname?.split('/chat/')[1]?.split('/')[0];

  if (!user) return null;

  return (
    <>
      <div className="flex flex-col h-full w-full bg-gray-950 border-r border-white/[0.05] flex-shrink-0">
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                <span className="text-base">💬</span>
              </div>
              <span className="font-semibold text-white text-base">Messenger</span>
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-green-400" aria-label="Połączono" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400" aria-label="Rozłączono" />
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowNewConv(true)}
              className="flex-1 btn-ghost border border-white/10 text-sm"
              title="Nowa rozmowa"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Nowa
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex-1 btn-ghost border border-white/10 text-sm"
              title="Nowa grupa"
            >
              <Users className="w-4 h-4" />
              Grupa
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj rozmów…"
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-3">
                <MessageSquarePlus className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400">
                {search ? 'Brak wyników' : 'Brak rozmów. Zacznij nową!'}
              </p>
            </div>
          )}
          {filtered.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              currentUser={user}
              active={activeId === conv._id}
              onClick={() => {
                router.push(`/chat/${conv._id}`);
                onConversationSelect?.(conv._id);
              }}
            />
          ))}
        </div>

        <div className="px-3 py-3 border-t border-white/[0.05] flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-2.5 flex-1 min-w-0 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Avatar src={user.avatar} name={user.username} size="sm" online={true} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-[11px] text-green-400">Online</p>
            </div>
          </Link>
          <Link
            href="/profile"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            title="Profil i ustawienia"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Wyloguj"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={handleNewConversation}
      />
      <NewConversationModal
        isOpen={showNewConv}
        onClose={() => setShowNewConv(false)}
        onCreated={handleNewConversation}
      />
    </>
  );
}

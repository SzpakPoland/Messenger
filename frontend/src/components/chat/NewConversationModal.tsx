'use client';

import { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { usersAPI, conversationsAPI } from '@/lib/api';
import type { User, Conversation } from '@/types';
import toast from 'react-hot-toast';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onCreated,
}: NewConversationModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersAPI.search(q);
        setResults(res.data.users);
      } catch {
        toast.error('Błąd wyszukiwania – sprawdź czy serwer działa');
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelect = async (user: User) => {
    setLoadingId(user._id);
    try {
      const res = await conversationsAPI.createPrivate(user._id);
      onCreated(res.data.conversation);
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Błąd';
      toast.error(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nowa rozmowa">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Szukaj po nazwie użytkownika…"
            className="input-field pl-10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {searching && (
            <div className="text-sm text-slate-400 text-center py-6">Szukam…</div>
          )}
          {!searching && results.length === 0 && query.trim() && (
            <div className="text-sm text-slate-400 text-center py-6">
              Nie znaleziono użytkowników
            </div>
          )}
          {!searching && results.length === 0 && !query.trim() && (
            <div className="text-sm text-slate-500 text-center py-6">
              Wpisz nazwę, aby wyszukać
            </div>
          )}
          {results.map((user) => (
            <button
              key={user._id}
              onClick={() => handleSelect(user)}
              disabled={loadingId === user._id}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left disabled:opacity-60"
            >
              <Avatar src={user.avatar} name={user.username} size="md" online={user.isOnline} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{user.username}</p>
              </div>
              {user.isOnline && (
                <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  Online
                </span>
              )}
              {loadingId === user._id && (
                <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

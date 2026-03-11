'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Users, X, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { usersAPI, conversationsAPI } from '@/lib/api';
import type { User, Conversation } from '@/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Maks. 5 MB'); return; }
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersAPI.search(q);
        setSearchResults(
          res.data.users.filter((u: User) => !selectedUsers.some((s) => s._id === u._id))
        );
      } catch {}
      finally { setSearching(false); }
    }, 300);
  };

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) return prev.filter((u) => u._id !== user._id);
      return [...prev, user];
    });
    setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
    setSearchQuery('');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error('Podaj nazwę grupy'); return; }
    const formData = new FormData();
    formData.append('name', groupName.trim());
    formData.append('description', description);
    formData.append('memberIds', JSON.stringify(selectedUsers.map((u) => u._id)));
    if (avatar) formData.append('avatar', avatar);

    setCreating(true);
    try {
      const res = await conversationsAPI.createGroup(formData);
      toast.success('Grupa została utworzona');
      onCreated(res.data.conversation);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Błąd tworzenia grupy';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName(''); setDescription(''); setAvatar(null);
    setAvatarPreview(null); setSearchQuery(''); setSearchResults([]);
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nowa grupa" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-xl bg-surface-700 border border-dashed border-white/20 hover:border-brand-500/50 cursor-pointer overflow-hidden group flex-shrink-0"
          >
            {avatarPreview ? (
              <Image src={avatarPreview} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-5 h-5 text-slate-500 group-hover:text-brand-400 transition-colors" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nazwa grupy *"
              className="input-field"
              maxLength={50}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opis (opcjonalnie)"
              className="input-field"
              maxLength={200}
            />
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg px-2 py-1"
              >
                <Avatar src={u.avatar} name={u.username} size="xs" />
                <span className="text-xs text-slate-200">{u.username}</span>
                <button onClick={() => toggleUser(u)} className="text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Dodaj uczestników</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Szukaj użytkownika…"
              className="input-field pl-10"
            />
          </div>
          {(searchResults.length > 0 || searching) && (
            <div className="mt-2 bg-surface-800 border border-white/[0.06] rounded-xl overflow-hidden">
              {searching ? (
                <div className="p-3 text-sm text-slate-400 text-center">Szukam…</div>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => toggleUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar src={u.avatar} name={u.username} size="sm" online={u.isOnline} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{u.username}</p>
                    </div>
                    {selectedUsers.some((s) => s._id === u._id) && (
                      <Check className="w-4 h-4 text-brand-400" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="btn-ghost flex-1 border border-white/10">
            Anuluj
          </button>
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
            {creating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Users className="w-4 h-4" />
                Utwórz grupę
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

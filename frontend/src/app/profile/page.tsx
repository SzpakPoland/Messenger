'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Save, Lock, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import { usersAPI, authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Maks. 5 MB'); return; }
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    const fd = new FormData();
    fd.append('username', username);
    fd.append('bio', bio);
    if (avatar) fd.append('avatar', avatar);

    setSavingProfile(true);
    try {
      const res = await usersAPI.updateProfile(fd);
      updateUser(res.data.user);
      setAvatar(null);
      setAvatarPreview(null);
      toast.success('Profil zaktualizowany');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Błąd';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) { toast.error('Uzupełnij wszystkie pola'); return; }
    if (newPass !== confirmPass) { toast.error('Hasła nie są zgodne'); return; }
    if (newPass.length < 6) { toast.error('Nowe hasło musi mieć min. 6 znaków'); return; }

    setSavingPass(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPass, newPassword: newPass });
      toast.success('Hasło zmienione');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Błąd';
      toast.error(msg);
    } finally {
      setSavingPass(false);
    }
  };

  const displayAvatar = avatarPreview || (user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) : null);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-900 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ustawienia profilu</h1>
          <p className="text-slate-400 text-sm mt-1">Zarządzaj swoim kontem</p>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Informacje</h2>

          <div className="flex items-center gap-5">
            <div className="relative">
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer group relative"
              >
                {displayAvatar ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden relative">
                    <Image src={displayAvatar} alt="avatar" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <Avatar src={null} name={user.username} size="xl" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user.username}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Zmień zdjęcie
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nazwa użytkownika</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Napisz coś o sobie…"
                className="input-field resize-none"
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{bio.length}/200</p>
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary w-full">
            {savingProfile ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Zapisz zmiany
              </>
            )}
          </button>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Zmiana hasła</h2>
          <div className="space-y-3">
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Aktualne hasło"
              className="input-field"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Nowe hasło (min. 6 znaków)"
              className="input-field"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Potwierdź nowe hasło"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <button onClick={handleChangePassword} disabled={savingPass} className="btn-primary w-full">
            {savingPass ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Zmień hasło
              </>
            )}
          </button>
        </div>

        <div className="card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Konto</h2>
          <div className="rounded-xl bg-surface-700/50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Dołączono</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(user.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors mt-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Wyloguj się</span>
          </button>
        </div>
      </div>
    </div>
  );
}

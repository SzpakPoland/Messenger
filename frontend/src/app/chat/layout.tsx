'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/chat/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const hasConversation = !!(pathname && pathname !== '/chat');

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <div className={`flex-shrink-0 ${hasConversation ? 'hidden md:block md:w-80' : 'w-full md:w-80'}`}>
        <Sidebar />
      </div>
      <main className={`${hasConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 overflow-hidden`}>
        {children}
      </main>
    </div>
  );
}

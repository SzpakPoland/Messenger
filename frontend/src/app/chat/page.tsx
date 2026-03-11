'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, Users } from 'lucide-react';
import NewConversationModal from '@/components/chat/NewConversationModal';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import type { Conversation } from '@/types';

export default function ChatEmptyPage() {
  const router = useRouter();
  const [showNewConv, setShowNewConv] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleCreated = (conv: Conversation) => {
    router.push(`/chat/${conv._id}`);
  };

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-900 text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500/20 to-violet-600/20 border border-brand-500/20 flex items-center justify-center mb-6">
          <span className="text-4xl">💬</span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Messenger</h2>
        <p className="text-slate-400 max-w-sm leading-relaxed mb-8">
          Wybierz rozmowę z listy po lewej stronie lub rozpocznij nową.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewConv(true)}
            className="btn-primary"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Nowa rozmowa
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn-ghost border border-white/10"
          >
            <Users className="w-4 h-4" />
            Utwórz grupę
          </button>
        </div>
      </div>
      <NewConversationModal
        isOpen={showNewConv}
        onClose={() => setShowNewConv(false)}
        onCreated={handleCreated}
      />
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import { Download, FileText, CheckCheck } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { Message, User } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface MessageBubbleProps {
  message: Message;
  currentUser: User;
  showAvatar: boolean;
  isGrouped: boolean;
}

const buildUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

export default function MessageBubble({
  message,
  currentUser,
  showAvatar,
  isGrouped,
}: MessageBubbleProps) {
  const isMine = message.sender._id === currentUser._id;
  const sender = message.sender;
  const time = format(new Date(message.createdAt), 'HH:mm');

  const isRead =
    isMine &&
    message.readBy.some((r) => r.user !== currentUser._id);

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
      {!isMine && (
        <div className="w-7 flex-shrink-0">
          {showAvatar ? (
            <Avatar src={sender.avatar} name={sender.username} size="xs" />
          ) : null}
        </div>
      )}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {!isMine && showAvatar && (
          <span className="text-[11px] text-slate-400 ml-1 mb-0.5">{sender.username}</span>
        )}

        {message.type === 'text' && (
          <div className={isMine ? 'message-bubble-self' : 'message-bubble-other'}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {message.type === 'image' && message.fileUrl && (
          <div className="rounded-2xl overflow-hidden cursor-pointer max-w-xs">
            <div className="relative w-64 h-44">
              <Image
                src={buildUrl(message.fileUrl)}
                alt="Zdjęcie"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {message.content && (
              <div className={isMine ? 'message-bubble-self rounded-tl-none rounded-tr-none' : 'message-bubble-other rounded-tl-none rounded-tr-none'}>
                <p className="text-sm">{message.content}</p>
              </div>
            )}
          </div>
        )}

        {message.type === 'file' && message.fileUrl && (
          <a
            href={buildUrl(message.fileUrl)}
            download={message.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className={`${isMine ? 'message-bubble-self' : 'message-bubble-other'} flex items-center gap-3 hover:opacity-90 transition-opacity`}
          >
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{message.fileName || 'Plik'}</p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0 opacity-70" />
          </a>
        )}

        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-500">{time}</span>
          {isMine && (
            <CheckCheck className={`w-3 h-3 ${isRead ? 'text-brand-400' : 'text-slate-500'}`} />
          )}
        </div>
      </div>
    </div>
  );
}

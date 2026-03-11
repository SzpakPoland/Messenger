'use client';

import { useState, useRef, useCallback } from 'react';
import { Paperclip, SendHorizonal, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSend: (content: string, file?: File) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSend,
  onTyping,
  onStopTyping,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = textarea.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }

    if (!isTyping.current) {
      isTyping.current = true;
      onTyping();
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      onStopTyping();
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Plik nie może przekraczać 20 MB');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    if (sending) return;

    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTyping.current = false;
    onStopTyping();

    setSending(true);
    try {
      await onSend(trimmed, file ?? undefined);
      setText('');
      clearFile();
      if (textarea.current) textarea.current.style.height = 'auto';
    } catch {
    } finally {
      setSending(false);
    }
  }, [text, file, sending, onSend, onStopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] bg-surface-900">
      {file && (
        <div className="mb-2 flex items-center gap-2 bg-surface-800 rounded-xl px-3 py-2">
          {filePreview ? (
            <img src={filePreview} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-brand-400" />
            </div>
          )}
          <span className="flex-1 text-sm text-slate-300 truncate">{file.name}</span>
          <button onClick={clearFile} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          disabled={disabled || sending}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-brand-400 hover:bg-brand-600/10 transition-all disabled:opacity-40"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        <textarea
          ref={textarea}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Napisz wiadomość… (Enter = wyślij, Shift+Enter = nowa linia)"
          disabled={disabled || sending}
          className="flex-1 bg-surface-800 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all leading-relaxed disabled:opacity-40"
          style={{ minHeight: '44px', maxHeight: '160px' }}
        />

        <button
          onClick={handleSend}
          disabled={disabled || sending || (!text.trim() && !file)}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SendHorizonal className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

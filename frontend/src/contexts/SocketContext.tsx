'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversations: (ids: string[]) => void;
  emitTyping: (conversationId: string) => void;
  emitStopTyping: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      const s = initSocket(token);
      setSocket(s);

      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      if (s.connected) setIsConnected(true);

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, token]);

  const joinConversations = useCallback(
    (ids: string[]) => {
      const s = getSocket();
      if (s?.connected) s.emit('join_conversations', ids);
    },
    []
  );

  const emitTyping = useCallback((conversationId: string) => {
    const s = getSocket();
    if (s?.connected) s.emit('typing', { conversationId });
  }, []);

  const emitStopTyping = useCallback((conversationId: string) => {
    const s = getSocket();
    if (s?.connected) s.emit('stop_typing', { conversationId });
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, joinConversations, emitTyping, emitStopTyping }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

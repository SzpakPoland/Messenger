import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Połączono:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Błąd połączenia:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Rozłączono:', reason);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : window.location.origin);

export const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('[Socket.IO] Connected to real-time server, id:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket.IO] Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('[Socket.IO] Connection error:', error.message);
});

export default socket;

import { io } from 'socket.io-client';
import { API_ORIGIN } from './api';

let socket = null;

function getToken() {
  try {
    const raw = localStorage.getItem('es-auth');
    return raw ? JSON.parse(raw)?.state?.token : null;
  } catch {
    return null;
  }
}

export function connectSocket() {
  if (socket?.connected) return socket;
  const socketUrl = import.meta.env.VITE_SOCKET_URL || API_ORIGIN;
  socket = io(socketUrl, {
    auth: { token: getToken() },
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

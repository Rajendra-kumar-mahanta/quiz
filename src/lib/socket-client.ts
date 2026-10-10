'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}

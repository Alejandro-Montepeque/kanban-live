import { io, Socket } from 'socket.io-client'

import { useAuthStore } from '@/stores/auth'
import type { ClientToServerEvents, ServerToClientEvents } from './socket-events'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (socket && socket.connected) return socket

  // Always read the freshest token from the store, even on reconnect.
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
  })
  socket.connect()
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { WsBroadcast } from '../../../shared/types.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

interface ClientMeta {
  callId?: string;
  heartbeat?: NodeJS.Timeout;
}

class WsHub {
  private wss?: WebSocketServer;
  private clients = new Map<WebSocket, ClientMeta>();

  attach(server: HttpServer) {
    if (this.wss) return;
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (socket, request) => {
      const url = new URL(request.url ?? '', 'http://localhost');
      const callId = url.searchParams.get('callId') ?? undefined;
      const meta: ClientMeta = { callId };
      this.clients.set(socket, meta);
      logger.info({ callId }, 'Browser connected to websocket');
      const heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      }, env.WS_HEARTBEAT_MS);
      meta.heartbeat = heartbeat;
      socket.on('message', () => {});
      socket.on('close', () => {
        this.clearClient(socket);
      });
      socket.on('error', (err) => {
        logger.warn({ err }, 'Websocket client error');
        this.clearClient(socket);
      });
    });
  }

  private clearClient(socket: WebSocket) {
    const meta = this.clients.get(socket);
    if (meta?.heartbeat) {
      clearInterval(meta.heartbeat);
    }
    this.clients.delete(socket);
  }

  broadcast(message: WsBroadcast) {
    const payload = JSON.stringify(message);
    for (const [socket, meta] of this.clients.entries()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (message.type !== 'status' && meta.callId && 'data' in message) {
        const callId = (message as any).data.callId ?? (message as any).data?.callId;
        if (callId && meta.callId !== callId) {
          continue;
        }
      }
      socket.send(payload);
    }
  }

  clientCount() {
    return this.clients.size;
  }

  async close() {
    if (!this.wss) return;
    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
    for (const [socket] of this.clients.entries()) {
      socket.close();
    }
    this.clients.clear();
    this.wss = undefined;
  }
}

export const wsHub = new WsHub();

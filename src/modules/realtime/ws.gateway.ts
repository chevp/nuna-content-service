/**
 * WebSocket gateway (optional module).
 *
 * Owns live client connections and broadcasts messages. The `ws` driver is
 * imported lazily so the HTTP service runs even when realtime is disabled or
 * the dependency is absent.
 */

import type { Server as HttpServer } from 'node:http';
import { logger } from '../../shared/utils';

export interface Socket {
  id: string;
  send(data: string): void;
}

export interface RealtimeMessage {
  channel: string;
  payload: unknown;
}

export class WsGateway {
  private readonly sockets = new Map<string, Socket>();
  private seq = 0;

  async attach(server: HttpServer): Promise<void> {
    const mod = (await import('ws').catch(() => null)) as {
      WebSocketServer: new (opts: { server: HttpServer }) => {
        on(event: 'connection', cb: (ws: { send: (d: string) => void; on: (e: string, cb: () => void) => void }) => void): void;
      };
    } | null;

    if (!mod) {
      logger.warn('ws driver not installed — realtime gateway disabled');
      return;
    }

    const wss = new mod.WebSocketServer({ server });
    wss.on('connection', (raw) => {
      const id = `sock_${(this.seq += 1).toString(36)}`;
      const socket: Socket = { id, send: (d) => raw.send(d) };
      this.sockets.set(id, socket);
      logger.info('realtime: client connected', { id });
      raw.on('close', () => this.sockets.delete(id));
    });
    logger.info('realtime: ws gateway attached');
  }

  /** Fan-out a message to every connected client. */
  broadcast(message: RealtimeMessage): void {
    const data = JSON.stringify(message);
    for (const socket of this.sockets.values()) socket.send(data);
  }

  get connections(): number {
    return this.sockets.size;
  }
}

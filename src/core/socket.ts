import type { Socket } from 'socket.io-client';
import { EventEmitter } from 'node:events';
import { loadConfig, getActiveProfile } from './config.js';
import { AuthError } from './errors.js';
import type { Message, MessageReaction } from '../types/index.js';

export interface AeroSocketEvents {
  newMessage: (message: Message) => void;
  messageUpdated: (message: Message) => void;
  messageReaction: (reactionEvent: {
    messageId: string;
    conversationId?: string;
    reactions: MessageReaction[];
    change?: { action: string; emoji: string; userId: string };
  }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:lastSeen': (data: { userId: string; lastSeen: string }) => void;
  'typing:start': (data: { conversationId: string; fromUserId: string }) => void;
  'typing:stop': (data: { conversationId: string; fromUserId: string }) => void;
  'messages:read': (data: { messageIds: string[]; conversationId: string }) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (err: Error) => void;
}

export class AeroSocket extends EventEmitter {
  private socket: Socket | null = null;
  private configPath?: string;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath;
  }

  public async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const config = loadConfig(this.configPath);
    const profile = getActiveProfile(config);

    if (!profile.accessToken) {
      throw new AuthError('Cannot connect real-time socket: no access token found');
    }

    const { io } = await import('socket.io-client');

    // Handshake parameters matching docs/03
    const socketUrl = profile.apiUrl || 'https://api.aryankaushik.space';

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      query: {
        EIO: '4',
      },
      auth: {
        token: profile.accessToken,
        platform: 'cli',
        appVersion: '0.1.0',
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      this.emit('error', err);
    });

    // Wire application domain events per docs/03
    const domainEvents = [
      'newMessage',
      'messageUpdated',
      'messageReaction',
      'user:online',
      'user:lastSeen',
      'typing:start',
      'typing:stop',
      'messages:read',
    ];

    for (const evt of domainEvents) {
      this.socket.on(evt, (payload: unknown) => {
        this.emit(evt, payload);
      });
    }

    return this.socket;
  }

  public joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('joinConversation', conversationId);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public getRawSocket(): Socket | null {
    return this.socket;
  }
}

let activeSocket: AeroSocket | null = null;

export function getAeroSocket(configPath?: string): AeroSocket {
  if (!activeSocket) {
    activeSocket = new AeroSocket(configPath);
  }
  return activeSocket;
}

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { createHttpClient } from './http.js';
import { UnsupportedError, UsageError } from './errors.js';
import type {
  Message,
  MessageReaction,
  SendMessageOptions,
  ListMessagesOptions,
  MediaUrlResponse,
} from '../types/index.js';

export type TransportScope = 'dm' | 'dock';

export class AeroTransport {
  private httpClient: AxiosInstance;
  private configPath?: string;

  constructor(configPath?: string, httpClient?: AxiosInstance) {
    this.configPath = configPath;
    this.httpClient = httpClient || createHttpClient(configPath);
  }

  public setHttpClient(client: AxiosInstance): void {
    this.httpClient = client;
  }

  /**
   * Send a new message to a DM recipient or dock channel.
   * HTTP POST per docs/02.
   */
  public async sendMessage(
    scope: TransportScope,
    targetId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Message> {
    if (!targetId) {
      throw new UsageError('Target ID is required to send a message');
    }
    if ((!text || text.trim().length === 0) && !options?.filePath) {
      throw new UsageError('Message text or an attachment file (--file) is required');
    }

    if (scope === 'dm') {
      // Direct messaging uses multipart POST /api/messages/send/{id} per docs/02:214
      const form = new FormData();
      form.append('text', text || '');
      form.append(
        '_previews',
        JSON.stringify({
          image: null,
          video: null,
          document: null,
          camera: null,
          contact: null,
        })
      );
      if (options?.replyToMessageId) {
        form.append('replyToMessageId', options.replyToMessageId);
      }
      if (options?.filePath) {
        if (!fs.existsSync(options.filePath)) {
          throw new UsageError(`Attachment file not found: ${options.filePath}`);
        }
        const fileBuffer = fs.readFileSync(options.filePath);
        const fileName = path.basename(options.filePath);
        const ext = path.extname(fileName).toLowerCase();
        let field = 'document';
        let mimeType = 'application/octet-stream';
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          field = 'image';
          mimeType = ext === '.jpg' ? 'image/jpeg' : `image/${ext.slice(1)}`;
        } else if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
          field = 'video';
          mimeType = `video/${ext === '.mov' ? 'quicktime' : ext.slice(1)}`;
        } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.flac'].includes(ext)) {
          field = 'document';
          mimeType = `audio/${ext.slice(1)}`;
        } else if (ext === '.pdf') {
          field = 'document';
          mimeType = 'application/pdf';
        }

        const blob = new Blob([fileBuffer], { type: mimeType });
        form.append(field, blob, fileName);
      }

      const res = await this.httpClient.post<Message>(
        `/api/messages/send/${targetId}`,
        form,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return res.data;
    } else if (scope === 'dock') {
      // Community dock channel uses JSON POST /api/docks/{dockId}/messages per docs/02:58
      const res = await this.httpClient.post<{ message: Message }>(
        `/api/docks/${targetId}/messages`,
        {
          text,
          channelId: options?.channelId,
        }
      );
      return res.data?.message || (res.data as unknown as Message);
    }

    throw new UsageError(`Invalid messaging scope: ${scope}`);
  }

  /**
   * Fetch messages for a direct chat thread or dock channel.
   * HTTP GET per docs/02.
   */
  public async listMessages(
    scope: TransportScope,
    targetId: string,
    options?: ListMessagesOptions
  ): Promise<Message[]> {
    if (!targetId) {
      throw new UsageError('Target ID is required to list messages');
    }

    const params: Record<string, string | number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.before) params.before = options.before;

    if (scope === 'dm') {
      // GET /api/messages/{id} per docs/02:40
      const res = await this.httpClient.get<Message[] | { messages: Message[] }>(
        `/api/messages/${targetId}`,
        { params }
      );
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.messages || [];
    } else if (scope === 'dock') {
      // If channel is specified: GET /api/docks/{dockId}/channels/{channelId}/messages per docs/02:56
      if (options?.channelId) {
        const res = await this.httpClient.get<Message[] | { messages: Message[] }>(
          `/api/docks/${targetId}/channels/${options.channelId}/messages`,
          { params }
        );
        return Array.isArray(res.data) ? res.data : res.data?.messages || [];
      }
      // Otherwise: GET /api/docks/{dockId}/messages per docs/02:57
      const res = await this.httpClient.get<Message[] | { messages: Message[] }>(
        `/api/docks/${targetId}/messages`,
        { params }
      );
      return Array.isArray(res.data) ? res.data : res.data?.messages || [];
    }

    throw new UsageError(`Invalid messaging scope: ${scope}`);
  }

  /**
   * Edit an existing message.
   * DM: PUT /api/messages/update/{messageId} (Empirically verified in har_reaction_edit.har Entry 24)
   * Dock: PUT /api/docks/{dockId}/messages/{messageId} (docs/02:59)
   */
  public async editMessage(
    scope: TransportScope,
    targetId: string,
    messageId: string,
    newText: string
  ): Promise<Message> {
    if (!messageId) {
      throw new UsageError('Message ID is required for editing');
    }
    if (!newText || newText.trim().length === 0) {
      throw new UsageError('New message text cannot be empty');
    }

    if (scope === 'dm') {
      const res = await this.httpClient.put<Message>(
        `/api/messages/update/${messageId}`,
        { text: newText }
      );
      return res.data;
    } else if (scope === 'dock') {
      const res = await this.httpClient.put<{ message: Message }>(
        `/api/docks/${targetId}/messages/${messageId}`,
        { text: newText }
      );
      return res.data?.message || (res.data as unknown as Message);
    }

    throw new UsageError(`Invalid messaging scope: ${scope}`);
  }

  /**
   * Delete an existing message.
   * DM: DELETE /api/messages/delete/{messageId} per docs/02:44
   * Dock: DELETE /api/docks/{dockId}/messages/{messageId} per docs/02:60
   */
  public async deleteMessage(
    scope: TransportScope,
    targetId: string,
    messageId: string
  ): Promise<{ message: string; messageId?: string }> {
    if (!messageId) {
      throw new UsageError('Message ID is required for deletion');
    }

    if (scope === 'dm') {
      const res = await this.httpClient.delete<{ message: string; messageId: string }>(
        `/api/messages/delete/${messageId}`
      );
      return res.data;
    } else if (scope === 'dock') {
      const res = await this.httpClient.delete<{ message: string }>(
        `/api/docks/${targetId}/messages/${messageId}`
      );
      return res.data;
    }

    throw new UsageError(`Invalid messaging scope: ${scope}`);
  }

  /**
   * Toggle emoji reaction on a message.
   * DM: POST /api/messages/{messageId}/react (har_reaction_edit.har Entries 38, 45)
   * Dock: POST /api/docks/{dockId}/messages/{messageId}/reactions (docs/02:50)
   */
  public async reactMessage(
    scope: TransportScope,
    targetId: string,
    messageId: string,
    emoji: string,
    _add = true
  ): Promise<MessageReaction[]> {
    if (!messageId) {
      throw new UsageError('Message ID is required for reactions');
    }
    if (!emoji) {
      throw new UsageError('Emoji character is required for reaction');
    }

    if (scope === 'dm') {
      const res = await this.httpClient.post<{ reactions: MessageReaction[] }>(
        `/api/messages/${messageId}/react`,
        { emoji }
      );
      return res.data?.reactions || [];
    } else if (scope === 'dock') {
      const res = await this.httpClient.post<{ reactions: MessageReaction[] }>(
        `/api/docks/${targetId}/messages/${messageId}/reactions`,
        { emoji }
      );
      return res.data?.reactions || [];
    }

    throw new UsageError(`Invalid messaging scope: ${scope}`);
  }

  /**
   * Fetch presigned media URL for a message attachment.
   * GET /api/messages/{id}/media-url?field={field}&variants={1}
   */
  public async getMediaUrl(
    messageId: string,
    options?: { field?: string; variants?: boolean }
  ): Promise<MediaUrlResponse> {
    if (!messageId) {
      throw new UsageError('Message ID is required to fetch media URL');
    }

    const field = options?.field || 'image';
    const params: Record<string, string | number> = { field };
    if (options?.variants) {
      params.variants = 1;
    }

    const res = await this.httpClient.get<MediaUrlResponse>(
      `/api/messages/${messageId}/media-url`,
      { params }
    );
    return res.data;
  }

  /**
   * Download a media attachment for a message to local disk.
   */
  public async downloadMedia(
    messageId: string,
    destination?: string,
    options?: { field?: string; originalFileName?: string }
  ): Promise<{ filename: string; path: string; size: number; url: string }> {
    const mediaInfo = await this.getMediaUrl(messageId, options);
    const mediaUrl = mediaInfo.url || mediaInfo.variants?.hd?.url || mediaInfo.variants?.sd?.url;
    if (!mediaUrl) {
      throw new UsageError('No download URL available for this message media');
    }

    let targetFileName = options?.originalFileName?.trim() || '';
    if (!targetFileName) {
      try {
        const parsed = new URL(mediaUrl);
        targetFileName = path.basename(parsed.pathname) || `attachment-${messageId}`;
      } catch {
        targetFileName = `attachment-${messageId}`;
      }
    }

    let outputPath = destination?.trim();
    if (!outputPath) {
      outputPath = path.resolve(process.cwd(), targetFileName);
    } else {
      outputPath = path.resolve(outputPath);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        outputPath = path.join(outputPath, targetFileName);
      }
    }

    const dlRes = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const buffer = Buffer.from(dlRes.data);
    fs.writeFileSync(outputPath, buffer);

    return {
      filename: path.basename(outputPath),
      path: outputPath,
      size: buffer.length,
      url: mediaUrl,
    };
  }

  /**
   * Unverified / Unknown operations documented in research/reports/coverage-gaps.md.
   */
  public async scheduleMessage(): Promise<never> {
    throw new UnsupportedError(
      'Scheduled Message Creation',
      'research/reports/coverage-gaps.md#1-unexercised-application-features'
    );
  }

  public async sendVoiceNote(): Promise<never> {
    throw new UnsupportedError(
      'Voice Note Recording & Upload',
      'research/reports/coverage-gaps.md#1-unexercised-application-features'
    );
  }

  public async togglePinnedMessage(): Promise<never> {
    throw new UnsupportedError(
      'Pinned Message Toggle',
      'research/reports/coverage-gaps.md#1-unexercised-application-features'
    );
  }

  public async registerAccount(): Promise<never> {
    throw new UnsupportedError(
      'New Account Registration',
      'research/reports/coverage-gaps.md#1-unexercised-application-features'
    );
  }
}

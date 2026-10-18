import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { AeroTransport } from '../../src/core/transport.js';
import { UnsupportedError, UsageError } from '../../src/core/errors.js';

describe('Core: AeroTransport Decision Layer', () => {
  it('routes DM edit to PUT /api/messages/update/{id}', async () => {
    let capturedMethod = '';
    let capturedUrl = '';
    let capturedData: unknown = null;

    const mockAxios = axios.create({
      adapter: async (config) => {
        capturedMethod = config.method || '';
        capturedUrl = config.url || '';
        capturedData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        return {
          status: 200,
          statusText: 'OK',
          data: {
            _id: 'msg-123',
            text: 'edited direct text',
            editedAt: '2026-10-17T14:53:52.203Z',
          },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);
    const result = await transport.editMessage('dm', 'user-456', 'msg-123', 'edited direct text');

    expect(capturedMethod.toLowerCase()).toBe('put');
    expect(capturedUrl).toBe('/api/messages/update/msg-123');
    expect(capturedData).toEqual({ text: 'edited direct text' });
    expect(result.text).toBe('edited direct text');
    expect(result.editedAt).toBeDefined();
  });

  it('routes Dock edit to PUT /api/docks/{dockId}/messages/{messageId}', async () => {
    let capturedMethod = '';
    let capturedUrl = '';
    let capturedData: unknown = null;

    const mockAxios = axios.create({
      adapter: async (config) => {
        capturedMethod = config.method || '';
        capturedUrl = config.url || '';
        capturedData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        return {
          status: 200,
          statusText: 'OK',
          data: {
            message: {
              _id: 'dock-msg-789',
              text: 'edited dock text',
              dockId: 'dock-100',
              editedAt: '2026-10-17T14:02:21.273Z',
            },
          },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);
    const result = await transport.editMessage('dock', 'dock-100', 'dock-msg-789', 'edited dock text');

    expect(capturedMethod.toLowerCase()).toBe('put');
    expect(capturedUrl).toBe('/api/docks/dock-100/messages/dock-msg-789');
    expect(capturedData).toEqual({ text: 'edited dock text' });
    expect(result.text).toBe('edited dock text');
  });

  it('routes DM reactions to POST /api/messages/{id}/react and Dock reactions to /api/docks/{dockId}/messages/{id}/reactions', async () => {
    const urls: string[] = [];
    const mockAxios = axios.create({
      adapter: async (config) => {
        urls.push(config.url || '');
        return {
          status: 200,
          statusText: 'OK',
          data: {
            reactions: [{ userId: 'u1', emoji: '👍' }],
          },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);

    // DM reaction
    await transport.reactMessage('dm', 'user-1', 'msg-1', '👍');
    expect(urls[0]).toBe('/api/messages/msg-1/react');

    // Dock reaction
    await transport.reactMessage('dock', 'dock-1', 'msg-2', '❤️');
    expect(urls[1]).toBe('/api/docks/dock-1/messages/msg-2/reactions');
  });

  it('routes DM send to POST /api/messages/send/{id} and Dock send to POST /api/docks/{id}/messages', async () => {
    const urls: string[] = [];
    const mockAxios = axios.create({
      adapter: async (config) => {
        urls.push(config.url || '');
        return {
          status: 200,
          statusText: 'OK',
          data: { _id: 'msg-new', text: 'hello' },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);

    // Send DM
    await transport.sendMessage('dm', 'user-target', 'hello', { replyToMessageId: 'reply-1' });
    expect(urls[0]).toBe('/api/messages/send/user-target');

    // Send Dock
    await transport.sendMessage('dock', 'dock-target', 'dock message', { channelId: 'chan-1' });
    expect(urls[1]).toBe('/api/docks/dock-target/messages');
  });

  it('routes listMessages for DM and Dock channels correctly', async () => {
    const urls: string[] = [];
    const mockAxios = axios.create({
      adapter: async (config) => {
        urls.push(config.url || '');
        return {
          status: 200,
          statusText: 'OK',
          data: { messages: [{ _id: 'm1', text: 'hi' }] },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);

    // DM list
    await transport.listMessages('dm', 'user-1', { limit: 10 });
    expect(urls[0]).toBe('/api/messages/user-1');

    // Dock channel list
    await transport.listMessages('dock', 'dock-1', { channelId: 'chan-1', limit: 20 });
    expect(urls[1]).toBe('/api/docks/dock-1/channels/chan-1/messages');

    // Dock general list
    await transport.listMessages('dock', 'dock-1', { limit: 20 });
    expect(urls[2]).toBe('/api/docks/dock-1/messages');
  });

  it('routes deleteMessage for DM and Dock correctly', async () => {
    const urls: string[] = [];
    const mockAxios = axios.create({
      adapter: async (config) => {
        urls.push(config.url || '');
        return {
          status: 200,
          statusText: 'OK',
          data: { message: 'Message deleted' },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);

    await transport.deleteMessage('dm', 'user-1', 'msg-to-delete');
    expect(urls[0]).toBe('/api/messages/delete/msg-to-delete');

    await transport.deleteMessage('dock', 'dock-1', 'dock-msg-to-delete');
    expect(urls[1]).toBe('/api/docks/dock-1/messages/dock-msg-to-delete');
  });

  it('throws UnsupportedError with doc reference on unverified mechanisms', async () => {
    const transport = new AeroTransport();

    await expect(transport.sendVoiceNote()).rejects.toThrow(UnsupportedError);
    await expect(transport.scheduleMessage()).rejects.toThrow(UnsupportedError);
    await expect(transport.togglePinnedMessage()).rejects.toThrow(UnsupportedError);
    await expect(transport.registerAccount()).rejects.toThrow(UnsupportedError);
  });

  it('validates required arguments and throws UsageError', async () => {
    const transport = new AeroTransport();

    await expect(transport.sendMessage('dm', '', 'hello')).rejects.toThrow(UsageError);
    await expect(transport.sendMessage('dm', 'user-1', '')).rejects.toThrow(UsageError);
    await expect(transport.listMessages('dm', '')).rejects.toThrow(UsageError);
    await expect(transport.deleteMessage('dm', 'user-1', '')).rejects.toThrow(UsageError);
    await expect(transport.getMediaUrl('')).rejects.toThrow(UsageError);
  });

  it('routes getMediaUrl to GET /api/messages/{id}/media-url with query params', async () => {
    let capturedUrl = '';
    let capturedParams: unknown = null;

    const mockAxios = axios.create({
      adapter: async (config) => {
        capturedUrl = config.url || '';
        capturedParams = config.params;
        return {
          status: 200,
          statusText: 'OK',
          data: {
            url: 'https://aero-media-prod.s3.amazonaws.com/test.webp',
            expiresIn: 3600,
            variants: {
              hd: { url: 'https://aero-media-prod.s3.amazonaws.com/hd.webp' },
            },
          },
          headers: {},
          config,
        };
      },
    });

    const transport = new AeroTransport(undefined, mockAxios);
    const res = await transport.getMediaUrl('msg-456', { field: 'document', variants: true });

    expect(capturedUrl).toBe('/api/messages/msg-456/media-url');
    expect(capturedParams).toEqual({ field: 'document', variants: 1 });
    expect(res.url).toBe('https://aero-media-prod.s3.amazonaws.com/test.webp');
    expect(res.expiresIn).toBe(3600);
    expect(res.variants?.hd?.url).toBeDefined();
  });
});

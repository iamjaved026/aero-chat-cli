import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AeroSocket } from '../../src/core/socket.js';
import { AuthError } from '../../src/core/errors.js';
import { saveConfig, createDefaultConfig } from '../../src/core/config.js';

describe('Core: Socket Connection Manager', () => {
  const tempDir = path.join(os.tmpdir(), `aero-socket-test-${Date.now()}`);
  const tempConfig = path.join(tempDir, 'socket-config.json');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('throws AuthError when connecting without access token', async () => {
    const cfg = createDefaultConfig();
    saveConfig(cfg, tempConfig);

    const aeroSocket = new AeroSocket(tempConfig);
    await expect(aeroSocket.connect()).rejects.toThrow(AuthError);
  });

  it('manages socket connection and event emission lifecycle', () => {
    const cfg = createDefaultConfig();
    cfg.profiles.default.accessToken = 'valid.jwt.token';
    saveConfig(cfg, tempConfig);

    const aeroSocket = new AeroSocket(tempConfig);
    expect(aeroSocket.isConnected()).toBe(false);

    let eventPayload: unknown = null;
    aeroSocket.on('newMessage', (payload) => {
      eventPayload = payload;
    });

    aeroSocket.emit('newMessage', { _id: 'msg-1', text: 'Hello socket' });
    expect(eventPayload).toEqual({ _id: 'msg-1', text: 'Hello socket' });

    aeroSocket.disconnect();
    expect(aeroSocket.isConnected()).toBe(false);
  });
});

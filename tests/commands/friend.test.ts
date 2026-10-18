import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Command } from 'commander';
import { registerFriendCommands } from '../../src/commands/friend.js';
import { saveConfig, createDefaultConfig } from '../../src/core/config.js';
import { globalOutput } from '../../src/core/output.js';

describe('Commands: Friend & Social Management', () => {
  const tempDir = path.join(os.tmpdir(), `aero-friend-test-${Date.now()}`);
  const tempConfig = path.join(tempDir, 'friend-test-config.json');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    const cfg = createDefaultConfig();
    cfg.profiles.default.accessToken = 'valid.access.jwt';
    cfg.profiles.default.refreshToken = 'valid.refresh.cookie';
    saveConfig(cfg, tempConfig);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('registers friend command and subcommands on program', () => {
    const program = new Command();
    program.option('--config <path>');
    registerFriendCommands(program);

    const friendCmd = program.commands.find(c => c.name() === 'friend');
    expect(friendCmd).toBeDefined();
    expect(friendCmd?.aliases()).toContain('friends');

    const subNames = friendCmd?.commands.map(c => c.name());
    expect(subNames).toContain('list');
    expect(subNames).toContain('find');
    expect(subNames).toContain('add');
    expect(subNames).toContain('requests');
    expect(subNames).toContain('accept');
    expect(subNames).toContain('reject');
    expect(subNames).toContain('remove');
    expect(subNames).toContain('block');
    expect(subNames).toContain('unblock');
  });

  it('friend find alias search works identically', () => {
    const program = new Command();
    program.option('--config <path>');
    registerFriendCommands(program);

    const friendCmd = program.commands.find(c => c.name() === 'friend');
    const findCmd = friendCmd?.commands.find(c => c.name() === 'find');
    expect(findCmd?.aliases()).toContain('search');
  });
});

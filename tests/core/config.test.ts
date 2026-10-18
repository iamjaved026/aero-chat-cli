import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadConfig,
  saveConfig,
  resolveConfigPath,
  getActiveProfile,
  updateActiveProfile,
  createDefaultConfig,
  hasConfig,
} from '../../src/core/config.js';
import { UsageError } from '../../src/core/errors.js';

describe('Core: Config Management', () => {
  const tempDir = path.join(os.tmpdir(), `aero-test-config-${Date.now()}`);
  const tempConfigFile = path.join(tempDir, 'test-config.json');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates a default configuration object', () => {
    const config = createDefaultConfig('https://api.custom.space');
    expect(config.activeProfile).toBe('default');
    expect(config.profiles.default.apiUrl).toBe('https://api.custom.space');
    expect(config.profiles.default.dobCompleted).toBe(false);
  });

  it('saves and loads configuration correctly', () => {
    const config = createDefaultConfig();
    config.profiles.default.accessToken = 'jwt.test.token';
    config.profiles.default.dobCompleted = true;

    saveConfig(config, tempConfigFile);
    expect(fs.existsSync(tempConfigFile)).toBe(true);

    const loaded = loadConfig(tempConfigFile);
    expect(loaded.activeProfile).toBe('default');
    expect(loaded.profiles.default.accessToken).toBe('jwt.test.token');
    expect(loaded.profiles.default.dobCompleted).toBe(true);
  });

  it('correctly reports hasConfig', () => {
    expect(hasConfig(tempConfigFile)).toBe(false);

    const config = createDefaultConfig();
    config.profiles.default.accessToken = 'test-token';
    saveConfig(config, tempConfigFile);

    expect(hasConfig(tempConfigFile)).toBe(true);
  });

  it('updates the active profile while preserving other settings', () => {
    const config = createDefaultConfig();
    saveConfig(config, tempConfigFile);

    updateActiveProfile({ accessToken: 'new-token', dobCompleted: true }, tempConfigFile);
    const updated = loadConfig(tempConfigFile);
    const active = getActiveProfile(updated);

    expect(active.accessToken).toBe('new-token');
    expect(active.dobCompleted).toBe(true);
    expect(active.apiUrl).toBe('https://api.aryankaushik.space');
  });

  it('throws friendly UsageError on malformed JSON configuration', () => {
    fs.writeFileSync(tempConfigFile, 'INVALID_JSON{abc}');
    expect(() => loadConfig(tempConfigFile)).toThrow(UsageError);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createHttpClient,
  singleFlightRefresh,
  resetRefreshMutex,
} from '../../src/core/http.js';
import {
  saveConfig,
  loadConfig,
  createDefaultConfig,
  getActiveProfile,
} from '../../src/core/config.js';
import { AuthError } from '../../src/core/errors.js';

describe('Core: HTTP Client & Single-Flight Token Refresh', () => {
  const tempDir = path.join(os.tmpdir(), `aero-http-test-${Date.now()}`);
  const tempConfig = path.join(tempDir, 'http-test-config.json');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    resetRefreshMutex();
    const cfg = createDefaultConfig();
    cfg.profiles.default.accessToken = 'expired.jwt.token';
    cfg.profiles.default.refreshToken = 'valid.refresh.cookie';
    saveConfig(cfg, tempConfig);
  });

  afterEach(() => {
    resetRefreshMutex();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('executes a single-flight refresh for N=5 concurrent 401 responses', async () => {
    let refreshCallCount = 0;
    let endpointCallCount = 0;

    // Custom adapter simulating 5 initial 401s and token refresh
    const mockAdapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/auth/refresh') {
        refreshCallCount++;
        return {
          data: { accessToken: 'new.fresh.jwt.token' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      endpointCallCount++;
      // If the request carries the newly refreshed token, succeed
      if (config.headers?.Authorization === 'Bearer new.fresh.jwt.token') {
        return {
          data: { success: true, path: config.url },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      // Otherwise simulate 401 Token Expired
      const err = new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        config,
        null,
        {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Access token expired', code: 'TOKEN_EXPIRED' },
          headers: {},
          config,
        }
      );
      throw err;
    };

    const testAxios = axios.create({ adapter: mockAdapter });
    const client = createHttpClient(tempConfig, testAxios);

    // Fire N=5 concurrent requests
    const endpoints = [
      '/api/users/me',
      '/api/messages/thread-1',
      '/api/messages/thread-2',
      '/api/docks/my',
      '/api/storage/usage',
    ];

    const results = await Promise.all(endpoints.map(ep => client.get(ep)));

    // Assert: POST /api/auth/refresh was called EXACTLY ONCE
    expect(refreshCallCount).toBe(1);

    // Assert: All 5 requests succeeded after replay
    expect(results).toHaveLength(5);
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    }

    // Total endpoint calls = 5 original + 5 replayed = 10
    expect(endpointCallCount).toBe(10);

    // Assert: Config was updated with new token
    const updatedConfig = loadConfig(tempConfig);
    const profile = getActiveProfile(updatedConfig);
    expect(profile.accessToken).toBe('new.fresh.jwt.token');
  });

  it('clears token and throws AuthError if refresh fails', async () => {
    const failingRefreshAdapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/auth/refresh') {
        throw new AxiosError(
          'Refresh session expired',
          'ERR_BAD_REQUEST',
          config,
          null,
          {
            status: 401,
            statusText: 'Unauthorized',
            data: { message: 'Invalid refresh token' },
            headers: {},
            config,
          }
        );
      }
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Token expired' },
        headers: {},
        config,
      });
    };

    const testAxios = axios.create({ adapter: failingRefreshAdapter });
    const client = createHttpClient(tempConfig, testAxios);

    await expect(client.get('/api/users/me')).rejects.toThrow(AuthError);

    // Token must be cleared from config
    const updated = loadConfig(tempConfig);
    expect(getActiveProfile(updated).accessToken).toBeUndefined();
  });

  it('correctly extracts refreshToken and csrf cookies from response headers', async () => {
    const { extractAuthCookies } = await import('../../src/core/http.js');
    const headers = {
      'set-cookie': [
        'refreshToken=abc123token; Max-Age=604800; Path=/; HttpOnly; Secure',
        'csrf=xyz789csrf; Max-Age=604800; Path=/; Secure',
      ],
    };
    const extracted = extractAuthCookies(headers);
    expect(extracted.refreshToken).toBe('abc123token');
    expect(extracted.csrf).toBe('xyz789csrf');
  });

  it('rotates refreshToken and csrf during singleFlightRefresh when returned by server', async () => {
    const rotatingAdapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/auth/refresh') {
        return {
          data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5MDAwMDAwMDB9.sig' },
          status: 200,
          statusText: 'OK',
          headers: {
            'set-cookie': [
              'refreshToken=rotated.new.cookie; Max-Age=604800; Path=/',
              'csrf=rotated.csrf; Max-Age=604800; Path=/',
            ],
          },
          config,
        };
      }
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    const testAxios = axios.create({ adapter: rotatingAdapter });
    await singleFlightRefresh(testAxios, tempConfig);

    const updated = loadConfig(tempConfig);
    const profile = getActiveProfile(updated);
    expect(profile.refreshToken).toBe('rotated.new.cookie');
    expect(profile.csrf).toBe('rotated.csrf');
  });
});

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from 'axios';
import { loadConfig, getActiveProfile, updateActiveProfile } from './config.js';
import { ApiError, AuthError, NetworkError } from './errors.js';
import { globalOutput } from './output.js';

export interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _isRefreshRequest?: boolean;
}

export function decodeJwtPayload(token: string): {
  userId?: string;
  sessionId?: string;
  type?: string;
  iat?: number;
  exp?: number;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function extractAuthCookies(headers?: Record<string, unknown>): {
  refreshToken?: string;
  csrf?: string;
} {
  if (!headers) return {};
  // Headers could be in set-cookie, Set-Cookie, etc.
  const rawSetCookie = headers['set-cookie'] || headers['Set-Cookie'];
  if (!rawSetCookie) return {};
  const cookies = Array.isArray(rawSetCookie) ? rawSetCookie : [String(rawSetCookie)];
  let refreshToken: string | undefined;
  let csrf: string | undefined;

  for (const cookie of cookies) {
    const cookieStr = String(cookie);
    const matchRefresh = cookieStr.match(/(?:^|;\s*)refreshToken=([^;]+)/);
    if (matchRefresh) {
      refreshToken = matchRefresh[1].trim();
    }
    const matchCsrf = cookieStr.match(/(?:^|;\s*)csrf=([^;]+)/);
    if (matchCsrf) {
      csrf = matchCsrf[1].trim();
    }
  }

  return { refreshToken, csrf };
}

let activeRefreshPromise: Promise<string> | null = null;

export function resetRefreshMutex(): void {
  activeRefreshPromise = null;
}

export async function singleFlightRefresh(
  httpClient: AxiosInstance,
  configPath?: string
): Promise<string> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const config = loadConfig(configPath);
      const profile = getActiveProfile(config);
      if (!profile.refreshToken) {
        throw new AuthError('No refresh token available. Session expired. Please run: aero auth login');
      }

      const headers: Record<string, string> = {
        Cookie: `refreshToken=${profile.refreshToken}`,
      };
      if (profile.accessToken) {
        headers['Authorization'] = `Bearer ${profile.accessToken}`;
      }
      if (profile.csrf) {
        headers['X-CSRF-Token'] = profile.csrf;
      }

      const refreshConfig: AxiosRequestConfig & { _isRefreshRequest: boolean } = {
        headers,
        _isRefreshRequest: true,
      };

      const response = await httpClient.post<{ accessToken: string }>(
        '/api/auth/refresh',
        {},
        refreshConfig
      );

      const newToken = response.data?.accessToken;
      if (!newToken) {
        throw new AuthError('Token refresh failed: missing access token in response');
      }

      const { refreshToken: rotatedRefreshToken, csrf: newCsrf } = extractAuthCookies(
        response.headers as unknown as Record<string, unknown>
      );
      const claims = decodeJwtPayload(newToken);
      const tokenExpiresAt = claims?.exp ? claims.exp * 1000 : Date.now() + 300 * 1000;

      updateActiveProfile(
        {
          accessToken: newToken,
          refreshToken: rotatedRefreshToken || profile.refreshToken,
          csrf: newCsrf || profile.csrf,
          tokenExpiresAt,
        },
        configPath
      );
      return newToken;
    } catch (err) {
      updateActiveProfile({ accessToken: undefined }, configPath);
      if (err instanceof AuthError) throw err;
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : String(err));
      throw new AuthError(`Session expired (${errMsg}). Please run: aero auth login`);
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export function createHttpClient(configPath?: string, customAxios?: AxiosInstance): AxiosInstance {
  const config = loadConfig(configPath);
  const profile = getActiveProfile(config);

  const client =
    customAxios ||
    axios.create({
      baseURL: profile.apiUrl || 'https://api.aryankaushik.space',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://aeroweb.aryankaushik.space',
        Referer: 'https://aeroweb.aryankaushik.space/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 aero-chat-cli/0.1.0',
      },
    });

  // Request interceptor
  client.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    const customConfig = reqConfig as CustomRequestConfig;
    if (customConfig._isRefreshRequest) {
      return reqConfig;
    }

    const currentCfg = loadConfig(configPath);
    const active = getActiveProfile(currentCfg);

    // Proactive auto-refresh: if access token is expired or within 15s of expiry and refresh token exists
    const now = Date.now();
    const isExpired = active.tokenExpiresAt ? active.tokenExpiresAt - now < 15000 : !active.accessToken;

    if (isExpired && active.refreshToken && !customConfig._isRefreshRequest) {
      try {
        const refreshedToken = await singleFlightRefresh(client, configPath);
        reqConfig.headers.Authorization = `Bearer ${refreshedToken}`;
      } catch {
        if (active.accessToken && !reqConfig.headers.Authorization) {
          reqConfig.headers.Authorization = `Bearer ${active.accessToken}`;
        }
      }
    } else if (active.accessToken && !reqConfig.headers.Authorization) {
      reqConfig.headers.Authorization = `Bearer ${active.accessToken}`;
    }

    if (active.csrf && !['get', 'head', 'options'].includes(reqConfig.method?.toLowerCase() || '')) {
      reqConfig.headers['X-CSRF-Token'] = active.csrf;
    }

    const tz = currentCfg.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !reqConfig.headers['X-Timezone']) {
      reqConfig.headers['X-Timezone'] = tz;
    }

    if (globalOutput.isDebug()) {
      let safeData = reqConfig.data;
      if (typeof safeData === 'string' && safeData.includes('password')) {
        try {
          const parsed = JSON.parse(safeData);
          if (parsed.password) parsed.password = '***';
          safeData = parsed;
        } catch {
          // ignore parsing error
        }
      }
      globalOutput.debug(`HTTP OUT -> ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL || ''}${reqConfig.url}`, {
        method: reqConfig.method,
        url: reqConfig.url,
        data: safeData,
      });
    }

    return reqConfig;
  });

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (globalOutput.isDebug()) {
        globalOutput.debug(`HTTP IN <- ${response.status} ${response.statusText} (${response.config.url})`, {
          status: response.status,
          data: response.data,
        });
      }
      return response;
    },
    async (error: unknown) => {
      if (!(error instanceof AxiosError) || !error.config) {
        if (error instanceof Error) {
          throw new NetworkError(error.message);
        }
        throw new NetworkError('Unknown network failure');
      }

      const originalRequest = error.config as CustomRequestConfig;

      // Handle 401 Unauthorized for single-flight refresh
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest._isRefreshRequest
      ) {
        originalRequest._retry = true;
        try {
          const newToken = await singleFlightRefresh(client, configPath);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        } catch (refreshErr) {
          if (refreshErr instanceof AuthError) throw refreshErr;
          throw new AuthError('Session expired. Please run: aero auth login');
        }
      }

      if (globalOutput.isDebug() && error.response) {
        globalOutput.debug(`HTTP ERR <- ${error.response.status} ${error.response.statusText} (${error.config?.url})`, {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        });
      }

      if (!error.response) {
        throw new NetworkError(`Network connection error: ${error.message}`);
      }

      const status = error.response.status;
      const data = error.response.data as { message?: string; error?: string } | undefined;
      const message = data?.message || data?.error || error.message;

      if (status === 401 || status === 403) {
        throw new AuthError(message, status, error.response.data);
      }

      if (status === 400 && (data?.message === 'Invalid credentials' || data?.error === 'Invalid credentials')) {
        throw new AuthError(message, status, error.response.data);
      }

      throw new ApiError(message, status, error.response.data);
    }
  );

  return client;
}

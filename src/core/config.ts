import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AeroConfig, AeroProfile } from '../types/index.js';
import { UsageError } from './errors.js';

export const DEFAULT_API_URL = 'https://api.aryankaushik.space';

export function getDefaultConfigDir(): string {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'aero');
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, 'aero');
  }
  return path.join(os.homedir(), '.config', 'aero');
}

export function getDefaultConfigPath(): string {
  return path.join(getDefaultConfigDir(), 'config.json');
}

export function resolveConfigPath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }
  if (process.env.AERO_CONFIG) {
    return path.resolve(process.env.AERO_CONFIG);
  }
  const localConfig = path.resolve('.aerorc.json');
  if (fs.existsSync(localConfig)) {
    return localConfig;
  }
  return getDefaultConfigPath();
}

export function createDefaultConfig(apiUrl = DEFAULT_API_URL): AeroConfig {
  return {
    activeProfile: 'default',
    profiles: {
      default: {
        apiUrl: apiUrl || DEFAULT_API_URL,
        dobCompleted: false,
      },
    },
    preferences: {
      output: 'pretty',
      quiet: false,
    },
  };
}

export function validateConfig(data: unknown): AeroConfig {
  if (!data || typeof data !== 'object') {
    throw new UsageError('Invalid configuration: root must be an object');
  }
  const cfg = data as Partial<AeroConfig>;
  if (!cfg.activeProfile || typeof cfg.activeProfile !== 'string') {
    throw new UsageError('Invalid configuration: missing or invalid "activeProfile" string');
  }
  if (!cfg.profiles || typeof cfg.profiles !== 'object') {
    throw new UsageError('Invalid configuration: missing or invalid "profiles" object');
  }
  if (!cfg.profiles[cfg.activeProfile]) {
    cfg.profiles[cfg.activeProfile] = {
      apiUrl: DEFAULT_API_URL,
      dobCompleted: false,
    };
  }
  return {
    activeProfile: cfg.activeProfile,
    profiles: cfg.profiles as Record<string, AeroProfile>,
    preferences: cfg.preferences || { output: 'pretty', quiet: false },
  };
}

export function loadConfig(customPath?: string): AeroConfig {
  const filePath = resolveConfigPath(customPath);

  let rawConfig: AeroConfig;
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      rawConfig = validateConfig(JSON.parse(raw));
    } catch (err) {
      if (err instanceof UsageError) throw err;
      throw new UsageError(
        `Failed to parse configuration file at ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    rawConfig = createDefaultConfig();
  }

  // Apply environment variable overrides: AERO_TOKEN / AERO_API_URL
  const activeProfile = rawConfig.profiles[rawConfig.activeProfile] || {
    apiUrl: DEFAULT_API_URL,
    dobCompleted: false,
  };

  if (process.env.AERO_API_URL) {
    activeProfile.apiUrl = process.env.AERO_API_URL;
  }
  if (process.env.AERO_TOKEN) {
    activeProfile.accessToken = process.env.AERO_TOKEN;
  }

  rawConfig.profiles[rawConfig.activeProfile] = activeProfile;
  return rawConfig;
}

export function saveConfig(config: AeroConfig, customPath?: string): string {
  const filePath = resolveConfigPath(customPath);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  return filePath;
}

export function getActiveProfile(config: AeroConfig): AeroProfile {
  const profile = config.profiles[config.activeProfile];
  if (!profile) {
    return {
      apiUrl: DEFAULT_API_URL,
      dobCompleted: false,
    };
  }
  return profile;
}

export function updateActiveProfile(
  updates: Partial<AeroProfile>,
  customPath?: string
): AeroConfig {
  const config = loadConfig(customPath);
  const current = getActiveProfile(config);
  config.profiles[config.activeProfile] = {
    ...current,
    ...updates,
  };
  saveConfig(config, customPath);
  return config;
}

export function hasConfig(customPath?: string): boolean {
  if (process.env.AERO_TOKEN) return true;
  const filePath = resolveConfigPath(customPath);
  if (!fs.existsSync(filePath)) return false;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const active = parsed?.profiles?.[parsed?.activeProfile];
    return Boolean(active?.accessToken || active?.user);
  } catch {
    return false;
  }
}

import { Command } from 'commander';
import {
  loadConfig,
  getActiveProfile,
  updateActiveProfile,
  resolveConfigPath,
} from '../core/config.js';
import { createHttpClient, singleFlightRefresh, decodeJwtPayload, extractAuthCookies } from '../core/http.js';
import { AuthError, UsageError, UnsupportedError } from '../core/errors.js';
import { globalOutput } from '../core/output.js';
import { getAeroSocket } from '../core/socket.js';
import type { AeroUser } from '../types/index.js';

export { decodeJwtPayload };

async function readFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', err => reject(err));
  });
}

export async function handleStatus(): Promise<void> {
  const config = loadConfig();
  const profile = getActiveProfile(config);

  if (!profile.accessToken && !profile.refreshToken) {
    throw new AuthError('Not authenticated. Run: aero setup or aero auth login');
  }

  // Auto-refresh if access token is expired or missing but refresh token exists
  const now = Date.now();
  const isExpired = profile.tokenExpiresAt ? (profile.tokenExpiresAt - now <= 0) : !profile.accessToken;
  if (isExpired && profile.refreshToken) {
    try {
      const client = createHttpClient();
      await singleFlightRefresh(client);
      const reloaded = loadConfig();
      Object.assign(profile, getActiveProfile(reloaded));
    } catch {
      // Continue to display degraded/expired status
    }
  }

  const claims = profile.accessToken ? decodeJwtPayload(profile.accessToken) : null;
  const expTime = claims?.exp ? claims.exp * 1000 : profile.tokenExpiresAt || 0;
  const secondsRemaining = Math.max(0, Math.floor((expTime - Date.now()) / 1000));

  // Connectivity test via /api/time per docs/02:116
  let connectivity = 'OK';
  try {
    const client = createHttpClient();
    await client.get('/api/time');
  } catch (err) {
    connectivity = `Degraded (${err instanceof Error ? err.message : String(err)})`;
  }

  const statusData = {
    user: profile.user?.username || claims?.userId || 'unknown',
    userId: profile.user?._id || claims?.userId,
    sessionId: claims?.sessionId || 'unknown',
    apiUrl: profile.apiUrl,
    tokenExpiresAt: new Date(expTime).toISOString(),
    secondsRemaining,
    dobCompleted: Boolean(profile.dobCompleted),
    connectivity,
  };

  if (globalOutput.isJson()) {
    globalOutput.print(statusData);
  } else {
    const summary = [
      `User:           @${statusData.user} (${statusData.userId})`,
      `Session ID:     ${statusData.sessionId}`,
      `API Gateway:    ${statusData.apiUrl}`,
      `Token Expiry:   ${statusData.tokenExpiresAt} (${secondsRemaining}s remaining)`,
      `Connectivity:   ${connectivity}`,
    ].join('\n');
    globalOutput.print(statusData, summary);
  }
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Manage authentication and session state');

  // aero auth login
  auth
    .command('login')
    .description('Authenticate with Aero credentials')
    .option('-u, --username <username>', 'Username or email address')
    .option('-p, --password <password>', 'Account password')
    .option('--stdin', 'Read credentials from standard input')
    .action(async (options: { username?: string; password?: string; stdin?: boolean }) => {
      let identifier = options.username || process.env.AERO_USERNAME;
      let pass = options.password || process.env.AERO_PASSWORD;

      if (options.stdin) {
        const raw = await readFromStdin();
        try {
          const parsed = JSON.parse(raw);
          identifier = parsed.identifier || parsed.username;
          pass = parsed.password;
        } catch {
          const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length >= 2) {
            identifier = lines[0];
            pass = lines[1];
          }
        }
      }

      // Interactive prompts if credentials not provided
      if (!identifier || !pass) {
        const { input, password } = await import('@inquirer/prompts');
        if (!identifier) {
          identifier = await input({ message: 'Enter your username or email:' });
        }
        if (!pass) {
          pass = await password({ message: 'Enter your password:', mask: '*' });
        }
      }

      if (!identifier || !pass) {
        throw new UsageError('Username and password are required to login');
      }

      const client = createHttpClient();
      globalOutput.info(`Authenticating as ${identifier}...`);

      interface LoginResponse {
        _id: string;
        username: string;
        fullName?: string;
        email?: string;
        accessToken: string;
        requiresDateOfBirth?: boolean;
        plan?: string;
        joinedAt?: string;
      }

      const res = await client.post<LoginResponse>('/api/auth/login', {
        identifier,
        password: pass,
      });

      const { accessToken, requiresDateOfBirth, ...userData } = res.data;
      if (!accessToken) {
        throw new AuthError('Login failed: no access token returned by server');
      }

      let dobCompleted = true;
      // Handle DOB compliance gate per docs/04
      if (requiresDateOfBirth === true) {
        const { input } = await import('@inquirer/prompts');
        globalOutput.info('Date of birth verification required by policy.');
        const dob = await input({
          message: 'Enter date of birth (YYYY-MM-DD):',
          validate: val =>
            /^\d{4}-\d{2}-\d{2}$/.test(val) ? true : 'Please enter date in format YYYY-MM-DD',
        });

        await client.post(
          '/api/auth/date-of-birth',
          { dateOfBirth: dob },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        dobCompleted = true;
      }

      // Compute token expiry
      const jwtClaims = decodeJwtPayload(accessToken);
      const tokenExpiresAt = jwtClaims?.exp ? jwtClaims.exp * 1000 : Date.now() + 300 * 1000;

      const user: AeroUser = {
        _id: userData._id,
        id: userData._id,
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
        plan: userData.plan,
        joinedAt: userData.joinedAt,
      };

      const { refreshToken, csrf } = extractAuthCookies(res.headers as unknown as Record<string, unknown>);

      updateActiveProfile({
        accessToken,
        refreshToken,
        csrf,
        tokenExpiresAt,
        user,
        dobCompleted,
      });

      globalOutput.success(
        `Logged in successfully as @${user.username} (session ID: ${jwtClaims?.sessionId || 'active'})`
      );
    });

  // aero auth logout
  auth
    .command('logout')
    .description('Terminate current session and clear local credentials')
    .action(async () => {
      try {
        const client = createHttpClient();
        await client.post('/api/auth/logout', {});
      } catch {
        // Best-effort logout per spec
      }

      try {
        getAeroSocket().disconnect();
      } catch {
        // Best-effort socket close
      }

      updateActiveProfile({
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiresAt: undefined,
      });

      globalOutput.success('Logged out successfully. Local access tokens cleared.');
    });

  // aero auth refresh
  auth
    .command('refresh')
    .description('Force refresh the current JWT access token')
    .action(async () => {
      const client = createHttpClient();
      globalOutput.info('Requesting token refresh...');
      const newToken = await singleFlightRefresh(client);
      const claims = decodeJwtPayload(newToken);
      const expiry = claims?.exp ? new Date(claims.exp * 1000).toISOString() : 'in 5 minutes';
      globalOutput.success(`Access token refreshed successfully. Expires at: ${expiry}`);
    });

  // aero auth status
  auth
    .command('status')
    .description('Display active session state, JWT expiry, and connectivity')
    .action(handleStatus);

  // aero auth whoami
  auth
    .command('whoami')
    .description('Fetch and display authenticated user profile')
    .action(async () => {
      const config = loadConfig();
      const profile = getActiveProfile(config);

      if (!profile.accessToken) {
        throw new AuthError('Not authenticated. Run: aero setup or aero auth login');
      }

      const client = createHttpClient();
      const userId = profile.user?._id || decodeJwtPayload(profile.accessToken)?.userId;

      if (!userId) {
        throw new AuthError('Cannot resolve user ID. Run: aero auth login');
      }

      // GET /api/users/{id} per docs/02:84
      const res = await client.get(`/api/users/${userId}`);
      const userData = res.data;

      if (globalOutput.isJson()) {
        globalOutput.print(userData);
      } else {
        const text = [
          `Username:   @${userData.username || profile.user?.username}`,
          `Full Name:  ${userData.fullName || 'N/A'}`,
          `Email:      ${userData.email || profile.user?.email || 'N/A'}`,
          `Plan:       ${userData.plan || profile.user?.plan || 'free'}`,
          `Joined:     ${userData.joinedAt || 'N/A'}`,
        ].join('\n');
        globalOutput.print(userData, text);
      }
    });

  // aero auth register
  auth
    .command('register')
    .description('Register a new Aero account (Unverified endpoint)')
    .action(async () => {
      throw new UnsupportedError(
        'New Account Registration',
        'research/reports/coverage-gaps.md#1-unexercised-application-features'
      );
    });
}

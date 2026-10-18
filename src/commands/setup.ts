import { Command } from 'commander';
import pc from 'picocolors';
import {
  DEFAULT_API_URL,
  loadConfig,
  saveConfig,
  updateActiveProfile,
  resolveConfigPath,
} from '../core/config.js';
import { createHttpClient, extractAuthCookies } from '../core/http.js';
import { globalOutput } from '../core/output.js';
import { decodeJwtPayload } from './auth.js';
import type { AeroUser } from '../types/index.js';

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Run interactive first-time setup wizard')
    .action(async () => {
      const { input, password } = await import('@inquirer/prompts');
      globalOutput.info(pc.bold('Welcome to Aero CLI Setup Wizard!'));
      process.stdout.write(
        pc.dim('Open source developer & maintainer: Javed Hussain (@iamjaved026)\n') +
        pc.dim('Project repository: https://github.com/iamjaved026/aero-chat-cli\n\n') +
        pc.dim('This wizard will configure your API gateway endpoint and authenticate your session.\n\n')
      );

      // Step 1: Prompt API URL
      const apiUrl = await input({
        message: 'Enter Aero API Gateway URL:',
        default: DEFAULT_API_URL,
      });

      // Update API URL in config
      const cfg = loadConfig(program.opts().config);
      cfg.profiles[cfg.activeProfile].apiUrl = apiUrl.trim();
      saveConfig(cfg, program.opts().config);

      // Step 2: Prompt credentials
      process.stdout.write('\n');
      globalOutput.info('Please enter your account credentials:');

      const identifier = await input({
        message: 'Username or Email:',
        validate: v => (v.trim().length > 0 ? true : 'Username/Email is required'),
      });

      const pass = await password({
        message: 'Password:',
        mask: '*',
        validate: v => (v.length > 0 ? true : 'Password is required'),
      });

      // Step 3: Authenticate
      const client = createHttpClient(program.opts().config);
      globalOutput.info(`Connecting to ${apiUrl} as @${identifier}...`);

      interface LoginResult {
        _id: string;
        username: string;
        fullName?: string;
        email?: string;
        accessToken: string;
        requiresDateOfBirth?: boolean;
        plan?: string;
      }

      let res;
      try {
        res = await client.post<LoginResult>('/api/auth/login', {
          identifier: identifier.trim(),
          password: pass,
        });
      } catch (err: unknown) {
        if (globalOutput.isDebug()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const axiosErr = err as any;
          globalOutput.debug('Login Request Diagnostics', {
            endpoint: `${apiUrl}/api/auth/login`,
            identifier: identifier.trim(),
            status: axiosErr?.status || axiosErr?.response?.status,
            statusText: axiosErr?.response?.statusText,
            headers: axiosErr?.response?.headers,
            data: axiosErr?.response?.data || axiosErr?.responseData,
          });
        }
        const msg = err instanceof Error ? err.message : String(err);
        globalOutput.error(`Authentication failed: ${msg}`);
        if (msg.toLowerCase().includes('invalid credentials')) {
          process.stderr.write(
            pc.yellow('\nTroubleshooting Tip:\n') +
              pc.dim('  • The API gateway rejected the identifier and password combination.\n') +
              pc.dim('  • Ensure your username or email and password match your account on aeroweb.aryankaushik.space.\n') +
              pc.dim('  • Pass --debug for raw HTTP payloads: aero setup --debug\n')
          );
        }
        process.exit(3);
      }

      const { accessToken, requiresDateOfBirth, ...userData } = res.data;

      // Step 4: Handle Date of Birth compliance gate per docs/04
      let dobCompleted = true;
      if (requiresDateOfBirth === true) {
        const { input } = await import('@inquirer/prompts');
        process.stdout.write('\n');
        globalOutput.warn('Date of birth compliance verification required.');
        const dob = await input({
          message: 'Date of Birth (YYYY-MM-DD):',
          validate: val =>
            /^\d{4}-\d{2}-\d{2}$/.test(val) ? true : 'Please enter date in format YYYY-MM-DD',
        });

        await client.post(
          '/api/auth/date-of-birth',
          { dateOfBirth: dob.trim() },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        dobCompleted = true;
      }

      // Step 5: Save profile
      const jwtClaims = decodeJwtPayload(accessToken);
      const tokenExpiresAt = jwtClaims?.exp ? jwtClaims.exp * 1000 : Date.now() + 300 * 1000;

      const user: AeroUser = {
        _id: userData._id,
        id: userData._id,
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
        plan: userData.plan,
      };

      const { refreshToken, csrf } = extractAuthCookies(res.headers as unknown as Record<string, unknown>);

      updateActiveProfile(
        {
          apiUrl: apiUrl.trim(),
          accessToken,
          refreshToken,
          csrf,
          tokenExpiresAt,
          user,
          dobCompleted,
        },
        program.opts().config
      );

      const cfgPath = resolveConfigPath(program.opts().config);
      process.stdout.write('\n');
      globalOutput.success(pc.bold('Setup complete!'));
      process.stdout.write(`Session authenticated for ${pc.cyan(`@${user.username}`)}\n`);
      process.stdout.write(`Configuration saved to: ${pc.dim(cfgPath)}\n\n`);
      process.stdout.write(pc.bold('Try running:') + '\n');
      process.stdout.write(`  ${pc.green('aero status')}           Check session state & JWT expiry\n`);
      process.stdout.write(`  ${pc.green('aero friend list')}      List your friends\n`);
      process.stdout.write(`  ${pc.green('aero msg chats')}        List active conversations\n`);
      process.stdout.write(`  ${pc.green('aero dock list')}        List your community docks\n`);
      process.stdout.write(`  ${pc.green('aero credits')}          Open-source developer credits & repository\n`);
    });
}

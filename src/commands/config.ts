import { Command } from 'commander';
import {
  loadConfig,
  saveConfig,
  resolveConfigPath,
  getActiveProfile,
} from '../core/config.js';
import { globalOutput } from '../core/output.js';
import { UsageError } from '../core/errors.js';

export function registerConfigCommands(program: Command): void {
  const config = program.command('config').description('Manage CLI configuration settings');

  // aero config where
  config
    .command('where')
    .description('Print the path of the active configuration file')
    .action(() => {
      const cfgPath = resolveConfigPath(program.opts().config);
      if (globalOutput.isJson()) {
        globalOutput.print({ path: cfgPath });
      } else {
        process.stdout.write(cfgPath + '\n');
      }
    });

  // aero config list
  config
    .command('list')
    .description('List current configuration values')
    .action(() => {
      const cfg = loadConfig(program.opts().config);
      if (globalOutput.isJson()) {
        globalOutput.print(cfg);
      } else {
        const active = getActiveProfile(cfg);
        const lines = [
          `Active Profile:   ${cfg.activeProfile}`,
          `API URL:          ${active.apiUrl}`,
          `Authenticated:    ${Boolean(active.accessToken)}`,
          `User:             ${active.user?.username ? `@${active.user.username}` : 'none'}`,
          `Output Mode:      ${cfg.preferences?.output || 'pretty'}`,
          `Timezone:         ${cfg.preferences?.timezone || 'system default'}`,
        ];
        globalOutput.print(cfg, lines.join('\n'));
      }
    });

  // aero config get <key>
  config
    .command('get <key>')
    .description('Get a configuration value by key (e.g. apiUrl, preferences.output)')
    .action((key: string) => {
      const cfg = loadConfig(program.opts().config);
      const active = getActiveProfile(cfg);

      let value: unknown;
      if (key === 'apiUrl') {
        value = active.apiUrl;
      } else if (key === 'activeProfile') {
        value = cfg.activeProfile;
      } else if (key.startsWith('preferences.')) {
        const sub = key.replace('preferences.', '');
        // Justification: Dynamic key lookup against arbitrary user preferences object
        value = (cfg.preferences as Record<string, unknown>)?.[sub];
      } else if (key.startsWith('user.')) {
        const sub = key.replace('user.', '');
        // Justification: Dynamic key lookup against arbitrary user profile object
        value = (active.user as Record<string, unknown>)?.[sub];
      } else {
        // Justification: Dynamic key lookup against arbitrary profile field
        value = (active as unknown as Record<string, unknown>)?.[key];
      }

      if (value === undefined) {
        throw new UsageError(`Configuration key '${key}' not found`);
      }

      if (globalOutput.isJson()) {
        globalOutput.print({ [key]: value });
      } else {
        process.stdout.write(String(value) + '\n');
      }
    });

  // aero config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a configuration value (e.g. apiUrl, preferences.output)')
    .action((key: string, value: string) => {
      const cfg = loadConfig(program.opts().config);
      const active = getActiveProfile(cfg);

      if (key === 'apiUrl') {
        active.apiUrl = value;
      } else if (key === 'activeProfile') {
        cfg.activeProfile = value;
      } else if (key === 'output' || key === 'preferences.output') {
        if (value !== 'pretty' && value !== 'json') {
          throw new UsageError("output must be 'pretty' or 'json'");
        }
        cfg.preferences.output = value;
      } else if (key === 'quiet' || key === 'preferences.quiet') {
        cfg.preferences.quiet = value === 'true';
      } else if (key === 'timezone' || key === 'preferences.timezone') {
        cfg.preferences.timezone = value;
      } else {
        // Justification: Dynamic key assignment to arbitrary active profile property
        (active as unknown as Record<string, unknown>)[key] = value;
      }

      saveConfig(cfg, program.opts().config);
      globalOutput.success(`Configuration '${key}' set to '${value}'`);
    });
}

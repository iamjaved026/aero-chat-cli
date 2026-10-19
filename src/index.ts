import { Command } from 'commander';
import { globalOutput } from './core/output.js';
import { getExitCode } from './core/errors.js';
import { hasConfig } from './core/config.js';
import { registerSetupCommand } from './commands/setup.js';
import { registerAuthCommands, handleStatus } from './commands/auth.js';
import { registerMsgCommands } from './commands/msg.js';
import { registerDockCommands } from './commands/dock.js';
import { registerConfigCommands } from './commands/config.js';
import { registerCompletionCommand } from './commands/completion.js';
import { registerFriendCommands } from './commands/friend.js';
import { registerCreditsCommand } from './commands/credits.js';
import pc from 'picocolors';

const program = new Command();

program
  .name('aero')
  .description('Lightweight, self-hostable CLI client for the Aero messaging platform')
  .version('0.1.1')
  .option('--json', 'Output results in JSON format')
  .option('-q, --quiet', 'Suppress non-essential output and spinners')
  .option('-y, --yes', 'Automatically answer yes to prompts')
  .option('-D, --debug', 'Enable verbose debug logging (HTTP requests, status, response bodies)')
  .option('--config <path>', 'Custom path to configuration file')
  .exitOverride()
  .addHelpText(
    'after',
    `\n${pc.dim('────────────────────────────────────────────────────────────────')}\n` +
      `  ${pc.cyan('Aero Chat CLI')} • Maintained by ${pc.bold('Javed Hussain')} (${pc.green('@iamjaved026')})\n` +
      `  GitHub:     ${pc.underline('https://github.com/iamjaved026/aero-chat-cli')}\n` +
      `  Portfolios: ${pc.blue('https://javedhussain.com')} • ${pc.blue('https://iamjaved.site')}\n` +
      `  Run ${pc.green('aero credits')} for complete developer & open source license info.\n`
  )
  .hook('preAction', (_thisCommand, actionCommand) => {
    const opts = program.opts();
    globalOutput.setOptions({
      json: Boolean(opts.json),
      quiet: Boolean(opts.quiet),
      debug: Boolean(opts.debug),
    });

    // Check if configuration exists
    const actionName = actionCommand.name();
    const parentName = actionCommand.parent?.name();
    const isExempt =
      actionName === 'setup' ||
      actionName === 'login' ||
      actionName === 'config' ||
      parentName === 'config' ||
      actionName === 'completion' ||
      actionName === 'credits' ||
      actionName === 'credit' ||
      actionName === 'help';

    if (!isExempt && !hasConfig(opts.config)) {
      process.stderr.write('No Aero config found. Run: aero setup\n');
      process.exit(2);
    }
  });

// Register commands
registerSetupCommand(program);
registerAuthCommands(program);
registerMsgCommands(program);
registerDockCommands(program);
registerFriendCommands(program);
registerConfigCommands(program);
registerCompletionCommand(program);
registerCreditsCommand(program);

// Top-level alias: aero status -> aero auth status
program
  .command('status')
  .description('Display active session state and connectivity (alias for "aero auth status")')
  .action(handleStatus);

let didRun = false;
async function run(): Promise<void> {
  if (didRun) return;
  didRun = true;
  try {
    await program.parseAsync(process.argv);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string; exitCode?: number }).code;
      if (
        code === 'commander.helpDisplayed' ||
        code === 'commander.help' ||
        code === 'commander.version'
      ) {
        process.exit(0);
      }
      if (code.startsWith('commander.')) {
        // Usage, unknown command, and argument parsing errors exit with code 2
        process.exit(2);
      }
    }

    if (globalOutput.isDebug()) {
      // Justification: inspecting arbitrary error properties in debug mode
      const errObj = err as Record<string, unknown>;
      if (errObj && (errObj.status || errObj.responseData)) {
        globalOutput.debug('HTTP Error Status:', errObj.status);
        globalOutput.debug('HTTP Error Response Data:', errObj.responseData);
      }
      if (err instanceof Error && err.stack) {
        process.stderr.write(pc.dim(err.stack) + '\n');
      }
    }

    const exitCode = getExitCode(err);
    const message = err instanceof Error ? err.message : String(err);
    globalOutput.error(message);
    process.exit(exitCode);
  }
}

export { program, run };

// When executed directly, run the CLI
const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
const isCliEntry =
  Boolean(process.argv[1]) &&
  /(?:^|[\\/])(aero|aero-cli|aero-chat-cli|index)(?:\.[a-z]+)?$/i.test(process.argv[1]);

if (!isTestEnv && isCliEntry) {
  run();
}

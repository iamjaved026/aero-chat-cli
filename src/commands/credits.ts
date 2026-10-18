import { Command } from 'commander';
import pc from 'picocolors';
import { globalOutput } from '../core/output.js';

export function registerCreditsCommand(program: Command): void {
  const handler = () => {
    const creditsData = {
      project: 'Aero Chat CLI',
      package: 'aero-chat-cli',
      version: '0.1.0',
      apiSpecification: 'Aero / Intridium Web v1.5.0',
      developer: {
        name: 'Javed Hussain',
        role: 'Open Source Developer & Current Maintainer',
        github: 'https://github.com/iamjaved026',
        portfolios: [
          'https://javedhussain.com',
          'https://iamjaved.site',
        ],
      },
      upstreamPlatform: {
        platform: 'Aero Messaging Platform',
        originalAuthor: 'Aryan Kaushik',
      },
      repository: 'https://github.com/iamjaved026/aero-chat-cli',
      license: 'MIT',
      description: 'Lightweight, self-hostable, developer-friendly CLI client for the Aero messaging platform',
    };

    if (globalOutput.isJson()) {
      globalOutput.print(creditsData);
      return;
    }

    const divider = pc.dim('─'.repeat(64));
    process.stdout.write('\n' + divider + '\n');
    process.stdout.write(`  ${pc.bold(pc.cyan('AERO CHAT CLI'))} ${pc.dim('v0.1.0')} • ${pc.bold('Open-Source Terminal Client')}\n`);
    process.stdout.write(divider + '\n\n');

    process.stdout.write(`  ${pc.bold('Developer & Maintainer:')}  ${pc.green('Javed Hussain')}\n`);
    process.stdout.write(`  ${pc.bold('GitHub Profile:')}          ${pc.cyan('@iamjaved026')} ${pc.dim('(https://github.com/iamjaved026)')}\n`);
    process.stdout.write(`  ${pc.bold('Portfolio Websites:')}      ${pc.blue('https://javedhussain.com')}\n`);
    process.stdout.write(`                            ${pc.blue('https://iamjaved.site')}\n`);
    process.stdout.write(`  ${pc.bold('Project Repository:')}      ${pc.underline('https://github.com/iamjaved026/aero-chat-cli')}\n`);
    process.stdout.write(`  ${pc.bold('Package on NPM:')}          ${pc.yellow('aero-chat-cli')}\n`);
    process.stdout.write(`  ${pc.bold('API Specification:')}      ${pc.magenta('Aero / Intridium Web v1.5.0 Compatible')}\n`);
    process.stdout.write(`  ${pc.bold('Open Source License:')}      ${pc.magenta('MIT License (Free for everyone)')}\n\n`);

    process.stdout.write(divider + '\n');
    process.stdout.write(`  ${pc.bold('Upstream Platform & Community Notice:')}\n`);
    process.stdout.write(
      pc.dim(
        '  • The Aero web, desktop, and mobile platform was originally built by Aryan Kaushik.\n' +
        '  • Aero CLI is a standalone client engineered and maintained by Javed Hussain.\n' +
        '  • Engineered against Aero Web v1.5.0 API specifications.\n' +
        '  • If you encounter API changes or bugs, pull requests and issues are welcome!\n'
      )
    );
    process.stdout.write(divider + '\n\n');
  };

  program
    .command('credits')
    .alias('credit')
    .description('Display open-source developer credits, project repository, and license information')
    .action(handler);
}

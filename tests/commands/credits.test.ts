import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';
import { registerCreditsCommand } from '../../src/commands/credits.js';
import { globalOutput } from '../../src/core/output.js';

describe('Commands: Open-Source Credits', () => {
  it('registers credits command and alias credit', () => {
    const program = new Command();
    registerCreditsCommand(program);

    const creditsCmd = program.commands.find(c => c.name() === 'credits');
    expect(creditsCmd).toBeDefined();
    expect(creditsCmd?.aliases()).toContain('credit');
  });

  it('outputs JSON format when requested', async () => {
    const program = new Command();
    registerCreditsCommand(program);

    let printedJson: unknown = null;
    vi.spyOn(globalOutput, 'isJson').mockReturnValue(true);
    vi.spyOn(globalOutput, 'print').mockImplementation((data) => {
      printedJson = data;
    });

    await program.parseAsync(['node', 'test', 'credits']);

    expect(printedJson).toBeDefined();
    const data = printedJson as {
      project: string;
      developer: { name: string; role: string; github: string };
      repository: string;
    };
    expect(data.developer.name).toBe('Javed Hussain');
    expect(data.developer.github).toBe('https://github.com/iamjaved026');
    expect(data.repository).toBe('https://github.com/iamjaved026/aero-chat-cli');
  });
});

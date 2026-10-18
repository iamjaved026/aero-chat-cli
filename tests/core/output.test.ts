import { describe, it, expect, vi } from 'vitest';
import {
  stripAnsi,
  formatJson,
  formatPretty,
  formatTable,
  OutputManager,
} from '../../src/core/output.js';

describe('Core: Output Formatting', () => {
  it('strips ANSI escape sequences', () => {
    const colored = '\u001b[32mSuccess\u001b[39m \u001b[31mError\u001b[39m';
    expect(stripAnsi(colored)).toBe('Success Error');
  });

  it('formats json correctly', () => {
    const data = { key: 'value', count: 42 };
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2));
  });

  it('formats pretty strings and objects', () => {
    expect(formatPretty('hello world')).toBe('hello world');
    expect(formatPretty(null)).toBe('');
    expect(formatPretty(undefined)).toBe('');
    expect(formatPretty({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('formats tabular data with aligned columns', () => {
    const rows = [
      { id: '1', name: 'Alice', role: 'admin' },
      { id: '2', name: 'Bob', role: 'member' },
    ];
    const table = formatTable(rows, ['id', 'name', 'role']);
    expect(table).toContain('Alice');
    expect(table).toContain('Bob');
    expect(table).toContain('admin');
  });

  it('returns friendly message for empty tables', () => {
    expect(formatTable([], ['id'])).toBe('No records found.');
  });

  it('OutputManager respects json mode and quiet mode', () => {
    const mgr = new OutputManager({ json: true, quiet: false });
    expect(mgr.isJson()).toBe(true);
    expect(mgr.isQuiet()).toBe(false);

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    mgr.print({ status: 'ok' });
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "ok"'));

    mgr.error('Something failed');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('"Something failed"'));

    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});

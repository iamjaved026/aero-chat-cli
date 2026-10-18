import pc from 'picocolors';

export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

// Regex to strip ANSI escape codes
const ANSI_REGEX = /\x1B\[[0-9;]*[a-zA-Z]/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatPretty(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data === null || data === undefined) return '';
  return JSON.stringify(data, null, 2);
}

export function formatTable<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[]
): string {
  if (!rows || rows.length === 0) return 'No records found.';

  const colWidths: Record<string, number> = {};
  for (const col of columns) {
    const colName = String(col);
    colWidths[colName] = colName.length;
    for (const row of rows) {
      const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
      if (val.length > colWidths[colName]) {
        colWidths[colName] = val.length;
      }
    }
  }

  const header = columns
    .map(col => String(col).toUpperCase().padEnd(colWidths[String(col)]))
    .join('  ');
  const separator = columns
    .map(col => '-'.repeat(colWidths[String(col)]))
    .join('  ');

  const body = rows.map(row => {
    return columns
      .map(col => {
        const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        return val.padEnd(colWidths[String(col)]);
      })
      .join('  ');
  });

  return [pc.bold(header), separator, ...body].join('\n');
}

export class OutputManager {
  private jsonMode: boolean;
  private quietMode: boolean;
  private debugMode: boolean;

  constructor(options?: OutputOptions) {
    this.jsonMode = Boolean(options?.json);
    this.quietMode = Boolean(options?.quiet);
    this.debugMode = Boolean(options?.debug);
  }

  public setOptions(options: OutputOptions): void {
    if (options.json !== undefined) this.jsonMode = options.json;
    if (options.quiet !== undefined) this.quietMode = options.quiet;
    if (options.debug !== undefined) this.debugMode = options.debug;
  }

  public isJson(): boolean {
    return this.jsonMode;
  }

  public isQuiet(): boolean {
    return this.quietMode;
  }

  public isDebug(): boolean {
    return this.debugMode;
  }

  public debug(label: string, data?: unknown): void {
    if (!this.debugMode) return;
    process.stderr.write(pc.magenta(`[DEBUG] ${label}\n`));
    if (data !== undefined) {
      if (typeof data === 'string') {
        process.stderr.write(pc.dim(data) + '\n');
      } else {
        process.stderr.write(pc.dim(JSON.stringify(data, null, 2)) + '\n');
      }
    }
  }

  public print(data: unknown, fallbackText?: string): void {
    if (this.jsonMode) {
      process.stdout.write(formatJson(data) + '\n');
    } else {
      if (this.quietMode) return;
      if (fallbackText) {
        process.stdout.write(fallbackText + '\n');
      } else {
        process.stdout.write(formatPretty(data) + '\n');
      }
    }
  }

  public info(message: string): void {
    if (this.jsonMode || this.quietMode) return;
    process.stdout.write(pc.cyan('ℹ ') + message + '\n');
  }

  public success(message: string): void {
    if (this.jsonMode || this.quietMode) return;
    process.stdout.write(pc.green('✔ ') + message + '\n');
  }

  public warn(message: string): void {
    if (this.jsonMode) return;
    process.stderr.write(pc.yellow('⚠ ') + message + '\n');
  }

  public error(message: string): void {
    if (this.jsonMode) {
      process.stderr.write(JSON.stringify({ error: stripAnsi(message) }) + '\n');
    } else {
      process.stderr.write(pc.red('✖ ') + message + '\n');
    }
  }
}

export const globalOutput = new OutputManager();

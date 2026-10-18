export class AeroError extends Error {
  public readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'AeroError';
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UsageError extends AeroError {
  constructor(message: string) {
    super(message, 2);
    this.name = 'UsageError';
  }
}

export class AuthError extends AeroError {
  public readonly status?: number;
  public readonly responseData?: unknown;

  constructor(
    message = 'Authentication required. Run: aero auth login or aero setup',
    status?: number,
    responseData?: unknown
  ) {
    super(message, 3);
    this.name = 'AuthError';
    this.status = status;
    this.responseData = responseData;
  }
}

export class NetworkError extends AeroError {
  constructor(message: string) {
    super(message, 4);
    this.name = 'NetworkError';
  }
}

export class ApiError extends AeroError {
  public readonly status?: number;
  public readonly responseData?: unknown;

  constructor(message: string, status?: number, responseData?: unknown) {
    super(message, 1);
    this.name = 'ApiError';
    this.status = status;
    this.responseData = responseData;
  }
}

export class UnsupportedError extends AeroError {
  public readonly docReference: string;

  constructor(feature: string, docReference = 'research/reports/coverage-gaps.md') {
    super(
      `Feature '${feature}' is not supported or verified in this environment. See ${docReference} for empirical status and protocol details.`,
      1
    );
    this.name = 'UnsupportedError';
    this.docReference = docReference;
  }
}

export function getExitCode(error: unknown): number {
  if (error instanceof AeroError) {
    return error.exitCode;
  }
  return 1;
}

import { describe, it, expect } from 'vitest';
import {
  AeroError,
  UsageError,
  AuthError,
  NetworkError,
  ApiError,
  UnsupportedError,
  getExitCode,
} from '../../src/core/errors.js';

describe('Core: Typed Errors & Exit Codes', () => {
  it('maps UsageError to exit code 2', () => {
    const err = new UsageError('Missing required parameter');
    expect(err.exitCode).toBe(2);
    expect(getExitCode(err)).toBe(2);
    expect(err.name).toBe('UsageError');
    expect(err instanceof AeroError).toBe(true);
  });

  it('maps AuthError to exit code 3', () => {
    const err = new AuthError();
    expect(err.exitCode).toBe(3);
    expect(getExitCode(err)).toBe(3);
    expect(err.name).toBe('AuthError');
    expect(err.message).toContain('Run: aero auth login');
  });

  it('maps NetworkError to exit code 4', () => {
    const err = new NetworkError('Failed to reach gateway');
    expect(err.exitCode).toBe(4);
    expect(getExitCode(err)).toBe(4);
    expect(err.name).toBe('NetworkError');
  });

  it('maps ApiError to exit code 1 with status and payload', () => {
    const payload = { code: 'INVALID_CREDENTIALS', message: 'Bad password' };
    const err = new ApiError('Bad password', 400, payload);
    expect(err.exitCode).toBe(1);
    expect(err.status).toBe(400);
    expect(err.responseData).toEqual(payload);
    expect(err.name).toBe('ApiError');
  });

  it('maps UnsupportedError to exit code 1 with research doc reference', () => {
    const err = new UnsupportedError('Voice Note Recording', 'research/reports/coverage-gaps.md');
    expect(err.exitCode).toBe(1);
    expect(err.docReference).toBe('research/reports/coverage-gaps.md');
    expect(err.message).toContain("Feature 'Voice Note Recording' is not supported");
    expect(err.message).toContain('research/reports/coverage-gaps.md');
  });

  it('defaults unhandled unknown error to exit code 1', () => {
    expect(getExitCode(new Error('Random JS error'))).toBe(1);
    expect(getExitCode('string error')).toBe(1);
    expect(getExitCode(null)).toBe(1);
  });
});

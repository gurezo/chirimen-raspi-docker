import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ChirimenError,
  isChirimenError,
  isChirimenErrorCode,
  toChirimenError,
  toChirimenErrorPayload,
} from '../index.js';

describe('isChirimenErrorCode', () => {
  it('accepts known error codes', () => {
    expect(isChirimenErrorCode('InvalidAccess')).toBe(true);
    expect(isChirimenErrorCode('InvalidArgument')).toBe(true);
    expect(isChirimenErrorCode('DeviceUnavailable')).toBe(true);
    expect(isChirimenErrorCode('PermissionDenied')).toBe(true);
    expect(isChirimenErrorCode('ResourceBusy')).toBe(true);
    expect(isChirimenErrorCode('Operation')).toBe(true);
    expect(isChirimenErrorCode('Unknown')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isChirimenErrorCode('NotACode')).toBe(false);
    expect(isChirimenErrorCode(1)).toBe(false);
    expect(isChirimenErrorCode(null)).toBe(false);
  });
});

describe('ChirimenError', () => {
  it('stores code and message', () => {
    const error = new ChirimenError('InvalidArgument', 'bad pin');
    expect(error).toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidArgument',
      message: 'bad pin',
    });
    expect(isChirimenError(error)).toBe(true);
  });

  it('preserves cause when provided', () => {
    const cause = new Error('native');
    const error = new ChirimenError('PermissionDenied', 'denied', { cause });
    expect(error.cause).toBe(cause);
  });
});

describe('toChirimenError', () => {
  it('returns ChirimenError as-is', () => {
    const original = new ChirimenError('ResourceBusy', 'busy');
    expect(toChirimenError(original)).toBe(original);
  });

  it('wraps Error as Unknown', () => {
    const wrapped = toChirimenError(new Error('boom'));
    expect(wrapped).toMatchObject({
      name: 'ChirimenError',
      code: 'Unknown',
      message: 'boom',
    });
  });

  it('uses fallback for non-Error values', () => {
    const wrapped = toChirimenError(42, 'fallback');
    expect(wrapped).toMatchObject({
      code: 'Unknown',
      message: 'fallback',
    });
  });
});

describe('toChirimenErrorPayload', () => {
  it('returns only code and message without cause', () => {
    const cause = new Error('node errno');
    const error = new ChirimenError('DeviceUnavailable', 'no bus', { cause });
    const payload = toChirimenErrorPayload(error);

    expect(payload).toEqual({
      code: 'DeviceUnavailable',
      message: 'no bus',
    });
    expect(payload).not.toHaveProperty('cause');
    expect(Object.keys(payload).sort()).toEqual(['code', 'message']);
  });

  it('normalizes unknown errors into payload', () => {
    expect(toChirimenErrorPayload(new Error('oops'))).toEqual({
      code: 'Unknown',
      message: 'oops',
    });
  });
});

describe('libs/core node-free surface', () => {
  it('does not import node builtins from error sources', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, 'errors.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"]node:/);
  });
});

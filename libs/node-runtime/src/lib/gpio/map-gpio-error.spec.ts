import { ChirimenError } from 'core';
import { InvalidAccessError, OperationError } from 'node-web-gpio';
import { describe, expect, it } from 'vitest';
import { mapGpioError } from './map-gpio-error.js';

describe('mapGpioError', () => {
  it('maps InvalidAccessError to ChirimenError InvalidAccess', () => {
    const mapped = mapGpioError(new InvalidAccessError('denied'));
    expect(mapped).toBeInstanceOf(ChirimenError);
    expect(mapped.code).toBe('InvalidAccess');
    expect(mapped.message).toBe('denied');
  });

  it('maps OperationError to ChirimenError Operation', () => {
    const mapped = mapGpioError(new OperationError('busy'));
    expect(mapped).toBeInstanceOf(ChirimenError);
    expect(mapped.code).toBe('Operation');
    expect(mapped.message).toBe('busy');
  });

  it('returns existing ChirimenError as-is', () => {
    const original = new ChirimenError('Unknown', 'already mapped');
    expect(mapGpioError(original)).toBe(original);
  });

  it('maps unknown Error to ChirimenError Unknown', () => {
    const mapped = mapGpioError(new Error('boom'));
    expect(mapped).toBeInstanceOf(ChirimenError);
    expect(mapped.code).toBe('Unknown');
    expect(mapped.message).toBe('boom');
  });
});

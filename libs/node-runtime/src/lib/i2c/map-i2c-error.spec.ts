import { ChirimenError } from 'core';
import { OperationError } from 'node-web-i2c';
import { describe, expect, it, vi } from 'vitest';
import { mapI2cError } from './map-i2c-error.js';

vi.mock('node-web-i2c', () => {
  class MockOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OperationError';
    }
  }

  return {
    OperationError: MockOperationError,
    requestI2CAccess: vi.fn(),
  };
});

describe('mapI2cError', () => {
  it('maps OperationError to ChirimenError Operation', () => {
    const mapped = mapI2cError(new OperationError('busy'));
    expect(mapped).toBeInstanceOf(ChirimenError);
    expect(mapped.code).toBe('Operation');
    expect(mapped.message).toBe('busy');
  });

  it('returns existing ChirimenError as-is', () => {
    const original = new ChirimenError('Unknown', 'already mapped');
    expect(mapI2cError(original)).toBe(original);
  });

  it('maps unknown Error to ChirimenError Unknown', () => {
    const mapped = mapI2cError(new Error('boom'));
    expect(mapped).toBeInstanceOf(ChirimenError);
    expect(mapped.code).toBe('Unknown');
    expect(mapped.message).toBe('boom');
  });
});

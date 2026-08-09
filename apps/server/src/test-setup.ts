import { vi } from 'vitest';

vi.mock('node-web-i2c', () => ({
  requestI2CAccess: vi.fn(),
  OperationError: class OperationError extends Error {},
}));

vi.mock('node-web-gpio', () => ({
  requestGPIOAccess: vi.fn(),
  InvalidAccessError: class InvalidAccessError extends Error {},
  OperationError: class OperationError extends Error {},
}));

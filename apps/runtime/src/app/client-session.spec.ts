import type { GpioSession, I2cSession } from 'node-runtime';
import { describe, expect, it, vi } from 'vitest';
import { ClientSession } from './client-session.js';

function createGpioSessionMock(
  overrides: Partial<GpioSession> = {}
): GpioSession {
  return {
    isOpen: vi.fn(() => false),
    open: vi.fn(),
    release: vi.fn(),
    releaseAll: vi.fn(async () => {
      // no-op
    }),
    ...overrides,
  } as GpioSession;
}

function createI2cSessionMock(
  overrides: Partial<I2cSession> = {}
): I2cSession {
  return {
    isOpen: vi.fn(() => false),
    open: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(async () => {
      // no-op
    }),
    scan: vi.fn(),
    ...overrides,
  } as I2cSession;
}

describe('ClientSession', () => {
  it('cleans up GPIO then I2C resources', async () => {
    const gpio = createGpioSessionMock();
    const i2c = createI2cSessionMock();
    const session = new ClientSession({
      sessionId: 'session-1',
      gpio,
      i2c,
    });

    await session.cleanup();

    expect(gpio.releaseAll).toHaveBeenCalledOnce();
    expect(i2c.closeAll).toHaveBeenCalledOnce();
  });

  it('continues I2C cleanup when GPIO cleanup fails', async () => {
    const gpio = createGpioSessionMock({
      releaseAll: vi.fn(async () => {
        throw new Error('gpio failed');
      }),
    });
    const i2c = createI2cSessionMock();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // swallow expected log
    });
    const session = new ClientSession({
      sessionId: 'session-2',
      gpio,
      i2c,
    });

    await session.cleanup();

    expect(i2c.closeAll).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

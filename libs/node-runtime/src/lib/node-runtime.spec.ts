import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeRuntimeContext } from './node-runtime.js';

const {
  requestNodeGpioAccessMock,
  requestNodeI2CAccessMock,
  detectHardwareCapabilitiesMock,
} = vi.hoisted(() => ({
  requestNodeGpioAccessMock: vi.fn(),
  requestNodeI2CAccessMock: vi.fn(),
  detectHardwareCapabilitiesMock: vi.fn(),
}));

vi.mock('./gpio/request-node-gpio-access.js', () => ({
  requestNodeGpioAccess: requestNodeGpioAccessMock,
}));

vi.mock('./i2c/request-node-i2c-access.js', () => ({
  requestNodeI2CAccess: requestNodeI2CAccessMock,
}));

vi.mock('./hardware/detect-hardware-capabilities.js', () => ({
  detectHardwareCapabilities: detectHardwareCapabilitiesMock,
}));

describe('createNodeRuntimeContext', () => {
  beforeEach(() => {
    requestNodeGpioAccessMock.mockReset();
    requestNodeI2CAccessMock.mockReset();
    requestNodeI2CAccessMock.mockRejectedValue(new Error('no i2c'));
    detectHardwareCapabilitiesMock.mockReset();
    detectHardwareCapabilitiesMock.mockReturnValue({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });
  });

  it('attaches hardware capabilities detected at startup', async () => {
    detectHardwareCapabilitiesMock.mockReturnValueOnce({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'i2c-dev' },
    });
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));

    const context = await createNodeRuntimeContext();
    expect(detectHardwareCapabilitiesMock).toHaveBeenCalledTimes(1);
    expect(context.capabilities).toEqual({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'i2c-dev' },
    });
  });

  it('sets available ports when GPIO access succeeds', async () => {
    requestNodeGpioAccessMock.mockResolvedValueOnce({
      ports: new Map([
        [
          26,
          {
            portNumber: 26,
            portName: 'GPIO26',
            pinName: 'PIN26',
            exported: false,
            direction: 'out',
            export: vi.fn(),
            unexport: vi.fn(),
            read: vi.fn(),
            write: vi.fn(),
          },
        ],
      ]),
      unexportAll: vi.fn(),
    });

    const context = await createNodeRuntimeContext();
    expect(context.gpio.available).toBe(true);
    expect(context.gpio.ports).toEqual([{ portNumber: 26, direction: 'out' }]);
    expect(context.gpio.access).toBeDefined();
    expect(context.i2c.available).toBe(false);
  });

  it('falls back to unavailable stub when GPIO access fails', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));

    const context = await createNodeRuntimeContext();
    expect(context.gpio.available).toBe(false);
    expect(context.gpio.ports).toEqual([]);
    expect(context.gpio.access).toBeUndefined();
  });

  it('sets available ports when I2C access succeeds', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));
    requestNodeI2CAccessMock.mockReset();
    requestNodeI2CAccessMock.mockResolvedValueOnce({
      ports: new Map([
        [
          1,
          {
            portNumber: 1,
            portName: 'I2C1',
            pinName: '',
            open: vi.fn(),
          },
        ],
      ]),
    });

    const context = await createNodeRuntimeContext();
    expect(context.i2c.available).toBe(true);
    expect(context.i2c.ports).toEqual([{ portNumber: 1, portName: 'I2C1' }]);
    expect(context.i2c.access).toBeDefined();
  });

  it('falls back to unavailable stub when I2C access fails', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));
    requestNodeI2CAccessMock.mockReset();
    requestNodeI2CAccessMock.mockRejectedValueOnce(new Error('no i2c'));

    const context = await createNodeRuntimeContext();
    expect(context.i2c.available).toBe(false);
    expect(context.i2c.ports).toEqual([]);
    expect(context.i2c.access).toBeUndefined();
  });

  it('cleanup calls unexportAll when GPIO is available', async () => {
    const unexportAll = vi.fn(async () => {
      // no-op for unit tests
    });
    requestNodeGpioAccessMock.mockResolvedValueOnce({
      ports: new Map([
        [
          26,
          {
            portNumber: 26,
            portName: 'GPIO26',
            pinName: 'PIN26',
            exported: false,
            direction: 'out',
            export: vi.fn(),
            unexport: vi.fn(),
            read: vi.fn(),
            write: vi.fn(),
          },
        ],
      ]),
      unexportAll,
    });

    const context = await createNodeRuntimeContext();
    await context.cleanup();

    expect(unexportAll).toHaveBeenCalledTimes(1);
  });

  it('cleanup is a no-op when GPIO is unavailable', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));

    const context = await createNodeRuntimeContext();
    await expect(context.cleanup()).resolves.toBeUndefined();
  });
});

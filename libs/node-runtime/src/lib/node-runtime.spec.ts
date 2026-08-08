import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeRuntimeContext } from './node-runtime.js';

const { requestNodeGpioAccessMock } = vi.hoisted(() => ({
  requestNodeGpioAccessMock: vi.fn(),
}));

vi.mock('./gpio/request-node-gpio-access.js', () => ({
  requestNodeGpioAccess: requestNodeGpioAccessMock,
}));

describe('createNodeRuntimeContext', () => {
  beforeEach(() => {
    requestNodeGpioAccessMock.mockReset();
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
  });

  it('falls back to unavailable stub when GPIO access fails', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));

    const context = await createNodeRuntimeContext();
    expect(context.gpio.available).toBe(false);
    expect(context.gpio.ports).toEqual([]);
    expect(context.gpio.access).toBeUndefined();
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

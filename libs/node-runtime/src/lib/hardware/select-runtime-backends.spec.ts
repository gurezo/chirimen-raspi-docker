import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectRuntimeBackends } from './select-runtime-backends.js';

const { requestNodeGpioAccessMock, requestNodeI2CAccessMock } = vi.hoisted(
  () => ({
    requestNodeGpioAccessMock: vi.fn(),
    requestNodeI2CAccessMock: vi.fn(),
  })
);

vi.mock('../gpio/request-node-gpio-access.js', () => ({
  requestNodeGpioAccess: requestNodeGpioAccessMock,
}));

vi.mock('../i2c/request-node-i2c-access.js', () => ({
  requestNodeI2CAccess: requestNodeI2CAccessMock,
}));

function createGpioAccess() {
  return {
    ports: new Map([
      [
        26,
        {
          portNumber: 26,
          portName: 'GPIO26',
          pinName: 'PIN26',
          exported: false,
          direction: 'out' as const,
          export: vi.fn(),
          unexport: vi.fn(),
          read: vi.fn(),
          write: vi.fn(),
        },
      ],
    ]),
    unexportAll: vi.fn(),
  };
}

function createI2cAccess() {
  return {
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
  };
}

describe('selectRuntimeBackends', () => {
  beforeEach(() => {
    requestNodeGpioAccessMock.mockReset();
    requestNodeI2CAccessMock.mockReset();
  });

  it('uses node-web-gpio Sysfs backend when gpio capability is sysfs', async () => {
    const access = createGpioAccess();
    requestNodeGpioAccessMock.mockResolvedValueOnce(access);

    const selected = await selectRuntimeBackends({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'unavailable' },
    });

    expect(requestNodeGpioAccessMock).toHaveBeenCalledTimes(1);
    expect(requestNodeI2CAccessMock).not.toHaveBeenCalled();
    expect(selected.gpio).toEqual({ kind: 'sysfs', access });
    expect(selected.i2c).toEqual({ kind: 'unavailable' });
  });

  it('returns unsupported without calling node-web-gpio when gpio is gpiochip', async () => {
    const selected = await selectRuntimeBackends({
      gpio: { backend: 'gpiochip' },
      i2c: { backend: 'unavailable' },
    });

    expect(requestNodeGpioAccessMock).not.toHaveBeenCalled();
    expect(selected.gpio).toEqual({
      kind: 'unsupported',
      backend: 'gpiochip',
      reason: 'gpiochip backend is not implemented; GPIO unavailable',
    });
  });

  it('does not call node-web-gpio when gpio is unavailable', async () => {
    const selected = await selectRuntimeBackends({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });

    expect(requestNodeGpioAccessMock).not.toHaveBeenCalled();
    expect(selected.gpio).toEqual({ kind: 'unavailable' });
  });

  it('falls back to unavailable when sysfs request fails', async () => {
    requestNodeGpioAccessMock.mockRejectedValueOnce(new Error('no gpio'));

    const selected = await selectRuntimeBackends({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'unavailable' },
    });

    expect(requestNodeGpioAccessMock).toHaveBeenCalledTimes(1);
    expect(selected.gpio).toEqual({ kind: 'unavailable' });
  });

  it('uses node-web-i2c when i2c capability is i2c-dev', async () => {
    const access = createI2cAccess();
    requestNodeI2CAccessMock.mockResolvedValueOnce(access);

    const selected = await selectRuntimeBackends({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'i2c-dev' },
    });

    expect(requestNodeI2CAccessMock).toHaveBeenCalledTimes(1);
    expect(requestNodeGpioAccessMock).not.toHaveBeenCalled();
    expect(selected.i2c).toEqual({ kind: 'i2c-dev', access });
  });

  it('does not call node-web-i2c when i2c is unavailable', async () => {
    const selected = await selectRuntimeBackends({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });

    expect(requestNodeI2CAccessMock).not.toHaveBeenCalled();
    expect(selected.i2c).toEqual({ kind: 'unavailable' });
  });

  it('falls back to unavailable when i2c-dev request fails', async () => {
    requestNodeI2CAccessMock.mockRejectedValueOnce(new Error('no i2c'));

    const selected = await selectRuntimeBackends({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'i2c-dev' },
    });

    expect(requestNodeI2CAccessMock).toHaveBeenCalledTimes(1);
    expect(selected.i2c).toEqual({ kind: 'unavailable' });
  });
});

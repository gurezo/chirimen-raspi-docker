import { InvalidAccessError } from 'node-web-gpio';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeWebGpioAccessAdapter } from './gpio-access-adapter.js';
import { NodeWebGpioPortAdapter } from './gpio-port-adapter.js';
import { requestNodeGpioAccess } from './request-node-gpio-access.js';

const { requestGPIOAccessMock } = vi.hoisted(() => ({
  requestGPIOAccessMock: vi.fn(),
}));

vi.mock('node-web-gpio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node-web-gpio')>();
  return {
    ...actual,
    requestGPIOAccess: requestGPIOAccessMock,
  };
});

function createNativePortMock(portNumber: number) {
  const port = {
    portNumber,
    portName: `GPIO${portNumber}`,
    pinName: `PIN${portNumber}`,
    exported: false,
    direction: '' as '' | 'in' | 'out',
    export: vi.fn(async (direction: 'in' | 'out') => {
      port.direction = direction;
      port.exported = true;
    }),
    unexport: vi.fn(async () => {
      port.exported = false;
      port.direction = '';
    }),
    read: vi.fn(async (): Promise<0 | 1> => 0),
    write: vi.fn(async () => {
      // no-op for unit tests
    }),
  };
  return port;
}

describe('NodeWebGpioPortAdapter', () => {
  it('delegates export/read/write/unexport and maps values', async () => {
    const nativePort = createNativePortMock(26);
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    expect(port.portNumber).toBe(26);
    expect(port.portName).toBe('GPIO26');
    expect(port.pinName).toBe('PIN26');
    expect(port.exported).toBe(false);

    await port.export('in');
    expect(nativePort.export).toHaveBeenCalledWith('in');
    expect(port.direction).toBe('in');
    expect(port.exported).toBe(true);

    await expect(port.read()).resolves.toBe(0);

    await port.export('out');
    expect(port.direction).toBe('out');
    await port.write(1);
    expect(nativePort.write).toHaveBeenCalledWith(1);

    await port.unexport();
    expect(nativePort.unexport).toHaveBeenCalled();
  });

  it('maps native errors through mapGpioError', async () => {
    const nativePort = createNativePortMock(17);
    nativePort.exported = true;
    nativePort.direction = 'in';
    nativePort.read.mockRejectedValueOnce(new InvalidAccessError('native failure'));
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.read()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'native failure',
    });
  });

  it('reads 0 and 1 from an input port', async () => {
    const nativePort = createNativePortMock(26);
    nativePort.exported = true;
    nativePort.direction = 'in';
    nativePort.read
      .mockResolvedValueOnce(0 as const)
      .mockResolvedValueOnce(1 as const);
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.read()).resolves.toBe(0);
    await expect(port.read()).resolves.toBe(1);
  });

  it('writes 0 and 1 to an output port', async () => {
    const nativePort = createNativePortMock(17);
    nativePort.exported = true;
    nativePort.direction = 'out';
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await port.write(0);
    await port.write(1);

    expect(nativePort.write).toHaveBeenNthCalledWith(1, 0);
    expect(nativePort.write).toHaveBeenNthCalledWith(2, 1);
  });

  it('rejects write values other than 0 or 1', async () => {
    const nativePort = createNativePortMock(17);
    nativePort.exported = true;
    nativePort.direction = 'out';
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.write(2 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(port.write(-1 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(port.write('1' as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativePort.write).not.toHaveBeenCalled();
  });

  it('rejects read when direction is out', async () => {
    const nativePort = createNativePortMock(26);
    nativePort.exported = true;
    nativePort.direction = 'out';
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.read()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativePort.read).not.toHaveBeenCalled();
  });

  it('rejects write when direction is in', async () => {
    const nativePort = createNativePortMock(26);
    nativePort.exported = true;
    nativePort.direction = 'in';
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.write(1)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativePort.write).not.toHaveBeenCalled();
  });

  it('rejects read and write when port is not exported', async () => {
    const nativePort = createNativePortMock(18);
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.read()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(port.write(1)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativePort.read).not.toHaveBeenCalled();
    expect(nativePort.write).not.toHaveBeenCalled();
  });
});

describe('NodeWebGpioAccessAdapter', () => {
  it('exposes adapted ports and delegates unexportAll', async () => {
    const nativePort = createNativePortMock(18);
    const unexportAll = vi.fn(async () => {
      // no-op for unit tests
    });
    const nativeAccess = {
      ports: new Map([[18, nativePort]]),
      unexportAll,
    };

    const access = new NodeWebGpioAccessAdapter(nativeAccess as never);
    expect(access.ports.size).toBe(1);
    expect(access.ports.get(18)?.portNumber).toBe(18);

    await access.unexportAll();
    expect(unexportAll).toHaveBeenCalled();
  });
});

describe('requestNodeGpioAccess', () => {
  beforeEach(() => {
    requestGPIOAccessMock.mockReset();
  });

  it('returns domain GpioAccess with port list', async () => {
    const nativePort = createNativePortMock(26);
    requestGPIOAccessMock.mockResolvedValueOnce({
      ports: new Map([[26, nativePort]]),
      unexportAll: vi.fn(async () => {
        // no-op for unit tests
      }),
    });

    const access = await requestNodeGpioAccess();
    expect(access.ports.size).toBe(1);
    expect([...access.ports.keys()]).toEqual([26]);
  });

  it('maps request failures to ChirimenError', async () => {
    requestGPIOAccessMock.mockRejectedValueOnce(
      new InvalidAccessError('gpio unavailable')
    );

    await expect(requestNodeGpioAccess()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'gpio unavailable',
    });
  });
});

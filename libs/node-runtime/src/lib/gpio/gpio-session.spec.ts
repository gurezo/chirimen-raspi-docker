import type { GpioAccess, GpioPort } from 'gpio';
import { InvalidAccessError } from 'node-web-gpio';
import { describe, expect, it, vi } from 'vitest';
import { NodeWebGpioPortAdapter } from './gpio-port-adapter.js';
import { createGpioSession } from './gpio-session.js';

function createPortMock(portNumber: number): GpioPort {
  let exported = false;
  let direction: 'in' | 'out' = 'out';

  return {
    portNumber,
    portName: `GPIO${portNumber}`,
    pinName: `PIN${portNumber}`,
    get exported() {
      return exported;
    },
    get direction() {
      return direction;
    },
    export: vi.fn(async (nextDirection: 'in' | 'out') => {
      direction = nextDirection;
      exported = true;
    }),
    unexport: vi.fn(async () => {
      exported = false;
    }),
    read: vi.fn(async () => 0 as const),
    write: vi.fn(async () => {
      // no-op for unit tests
    }),
  };
}

function createAccessMock(ports: Map<number, GpioPort>): GpioAccess {
  return {
    ports,
    unexportAll: vi.fn(async () => {
      // no-op for unit tests
    }),
  };
}

describe('GpioSession', () => {
  it('opens a port as input and tracks it', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    const opened = await session.open(26, 'in');

    expect(opened).toBe(port);
    expect(port.export).toHaveBeenCalledWith('in');
    expect(session.isOpen(26)).toBe(true);
  });

  it('opens a port as output', async () => {
    const port = createPortMock(17);
    const session = createGpioSession(
      createAccessMock(new Map([[17, port]]))
    );

    await session.open(17, 'out');

    expect(port.export).toHaveBeenCalledWith('out');
    expect(session.isOpen(17)).toBe(true);
  });

  it('rejects invalid port number', async () => {
    const session = createGpioSession(createAccessMock(new Map()));

    await expect(session.open(-1, 'in')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(session.open('26', 'in')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
  });

  it('rejects invalid direction', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await expect(session.open(26, 'inout')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
  });

  it('rejects missing port', async () => {
    const session = createGpioSession(
      createAccessMock(new Map([[18, createPortMock(18)]]))
    );

    await expect(session.open(26, 'in')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'GPIO port 26 is not available',
    });
  });

  it('rejects duplicate open in the same session', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await session.open(26, 'in');

    await expect(session.open(26, 'in')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'GPIO port 26 is already open in this session',
    });
    await expect(session.open(26, 'out')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'GPIO port 26 is already open in this session',
    });
    expect(port.export).toHaveBeenCalledTimes(1);
  });

  it('maps export failures to ChirimenError', async () => {
    const port = createPortMock(17);
    (port.export as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new InvalidAccessError('export denied')
    );
    const session = createGpioSession(
      createAccessMock(new Map([[17, port]]))
    );

    await expect(session.open(17, 'out')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'export denied',
    });
    expect(session.isOpen(17)).toBe(false);
  });
});

describe('NodeWebGpioPortAdapter.export direction validation', () => {
  it('rejects invalid direction before calling native export', async () => {
    const nativeExport = vi.fn(async () => {
      // no-op for unit tests
    });
    const nativePort = {
      portNumber: 26,
      portName: 'GPIO26',
      pinName: 'PIN26',
      exported: false,
      direction: 'out' as const,
      export: nativeExport,
      unexport: vi.fn(async () => {
        // no-op for unit tests
      }),
      read: vi.fn(async () => 0 as const),
      write: vi.fn(async () => {
        // no-op for unit tests
      }),
    };
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.export('inout' as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativeExport).not.toHaveBeenCalled();
  });
});

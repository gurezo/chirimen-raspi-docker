import type { GpioAccess, GpioPort } from 'gpio';
import { InvalidAccessError } from 'node-web-gpio';
import { describe, expect, it, vi } from 'vitest';
import { NodeWebGpioPortAdapter } from './gpio-port-adapter.js';
import { createGpioSession } from './gpio-session.js';

function createPortMock(portNumber: number): GpioPort {
  let exported = false;
  let direction: 'in' | 'out' = 'out';
  let onchange: GpioPort['onchange'] = null;

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
    get onchange() {
      return onchange;
    },
    set onchange(handler) {
      onchange = handler;
    },
    export: vi.fn(async (nextDirection: 'in' | 'out') => {
      direction = nextDirection;
      exported = true;
    }),
    unexport: vi.fn(async () => {
      exported = false;
      onchange = null;
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

  it('releases an open port and allows re-open', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await session.open(26, 'in');
    await session.release(26);

    expect(port.unexport).toHaveBeenCalledTimes(1);
    expect(session.isOpen(26)).toBe(false);

    await session.open(26, 'out');
    expect(port.export).toHaveBeenCalledTimes(2);
    expect(port.export).toHaveBeenLastCalledWith('out');
    expect(session.isOpen(26)).toBe(true);
  });

  it('treats release of unopened or already released ports as no-op', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await expect(session.release(26)).resolves.toBeUndefined();
    expect(port.unexport).not.toHaveBeenCalled();

    await session.open(26, 'in');
    await session.release(26);
    await expect(session.release(26)).resolves.toBeUndefined();
    expect(port.unexport).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid port number on release', async () => {
    const session = createGpioSession(createAccessMock(new Map()));

    await expect(session.release(-1)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(session.release('26')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
  });

  it('releaseAll unexports all opened ports', async () => {
    const port26 = createPortMock(26);
    const port17 = createPortMock(17);
    const session = createGpioSession(
      createAccessMock(
        new Map([
          [26, port26],
          [17, port17],
        ])
      )
    );

    await session.open(26, 'in');
    await session.open(17, 'out');
    await session.releaseAll();

    expect(port26.unexport).toHaveBeenCalledTimes(1);
    expect(port17.unexport).toHaveBeenCalledTimes(1);
    expect(session.isOpen(26)).toBe(false);
    expect(session.isOpen(17)).toBe(false);
  });

  it('releaseAll stops watch on subscribed input ports', async () => {
    const port = createPortMock(5);
    const session = createGpioSession(
      createAccessMock(new Map([[5, port]]))
    );

    await session.open(5, 'in');
    await session.subscribe(5, vi.fn());
    expect(port.onchange).toEqual(expect.any(Function));

    await session.releaseAll();

    expect(port.onchange).toBeNull();
    expect(port.unexport).toHaveBeenCalledTimes(1);
    expect(session.isOpen(5)).toBe(false);
  });

  it('maps unexport failures to ChirimenError', async () => {
    const port = createPortMock(17);
    (port.unexport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new InvalidAccessError('unexport denied')
    );
    const session = createGpioSession(
      createAccessMock(new Map([[17, port]]))
    );

    await session.open(17, 'out');
    await expect(session.release(17)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'unexport denied',
    });
    expect(session.isOpen(17)).toBe(true);
  });

  it('releaseAll clears tracking even when unexport fails', async () => {
    const port = createPortMock(17);
    (port.unexport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new InvalidAccessError('unexport denied')
    );
    const session = createGpioSession(
      createAccessMock(new Map([[17, port]]))
    );

    await session.open(17, 'out');
    await expect(session.releaseAll()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'unexport denied',
    });
    expect(session.isOpen(17)).toBe(false);
  });

  it('subscribes to an input port and fans out change events', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    await session.open(26, 'in');
    await session.subscribe(26, listenerA);
    await session.subscribe(26, listenerB);

    expect(port.onchange).toEqual(expect.any(Function));
    port.onchange?.({ value: 1, portNumber: 26 });

    expect(listenerA).toHaveBeenCalledWith({ value: 1, portNumber: 26 });
    expect(listenerB).toHaveBeenCalledWith({ value: 1, portNumber: 26 });
  });

  it('stops watch when the last subscriber unsubscribes', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    await session.open(26, 'in');
    await session.subscribe(26, listenerA);
    await session.subscribe(26, listenerB);

    await session.unsubscribe(26, listenerA);
    expect(port.onchange).toEqual(expect.any(Function));
    port.onchange?.({ value: 1, portNumber: 26 });
    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);

    await session.unsubscribe(26, listenerB);
    expect(port.onchange).toBeNull();
  });

  it('clears all subscribers when unsubscribe omits listener', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await session.open(26, 'in');
    await session.subscribe(26, vi.fn());
    await session.subscribe(26, vi.fn());
    await session.unsubscribe(26);

    expect(port.onchange).toBeNull();
  });

  it('clears watch on release even while subscribed', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );
    const listener = vi.fn();

    await session.open(26, 'in');
    await session.subscribe(26, listener);
    await session.release(26);

    expect(port.onchange).toBeNull();
    expect(port.unexport).toHaveBeenCalledTimes(1);
    expect(session.isOpen(26)).toBe(false);
  });

  it('rejects subscribe when port is not open or not input', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    await expect(session.subscribe(26, vi.fn())).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'GPIO port 26 is not open in this session',
    });

    await session.open(26, 'out');
    await expect(session.subscribe(26, vi.fn())).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: "GPIO port 26 direction is 'out', expected 'in' for subscribe",
    });
  });

  it('returns opened port via getOpenedPort', async () => {
    const port = createPortMock(26);
    const session = createGpioSession(
      createAccessMock(new Map([[26, port]]))
    );

    expect(() => session.getOpenedPort(26)).toThrow(
      expect.objectContaining({
        name: 'ChirimenError',
        code: 'InvalidAccess',
      })
    );

    await session.open(26, 'in');
    expect(session.getOpenedPort(26)).toBe(port);
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
      on: vi.fn(),
      off: vi.fn(),
    };
    const port = new NodeWebGpioPortAdapter(nativePort as never);

    await expect(port.export('inout' as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativeExport).not.toHaveBeenCalled();
  });
});

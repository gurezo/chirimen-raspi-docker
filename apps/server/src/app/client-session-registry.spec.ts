import type { GpioAccess, GpioPort } from 'gpio';
import type { NodeRuntimeContext } from 'node-runtime';
import { createGpioSession, createI2cSession } from 'node-runtime';
import { describe, expect, it, vi } from 'vitest';
import { createClientSessionRegistry } from './client-session-registry.js';

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
      // no-op
    }),
  };
}

function createRuntimeContextMock(
  gpioAccess?: GpioAccess
): NodeRuntimeContext {
  return {
    health: { name: 'test', status: 'ok', version: '0.0.1' },
    capabilities: {
      gpio: { backend: gpioAccess ? 'sysfs' : 'unavailable' },
      i2c: { backend: 'unavailable' },
    },
    gpio: {
      available: Boolean(gpioAccess),
      ports: [],
      access: gpioAccess,
    },
    i2c: {
      available: false,
      ports: [],
    },
    cleanup: vi.fn(async () => {
      // no-op
    }),
  };
}

describe('ClientSessionRegistry', () => {
  it('creates a session with a generated sessionId', () => {
    const registry = createClientSessionRegistry(createRuntimeContextMock(), {
      createSessionId: () => 'fixed-session-id',
    });

    const session = registry.create();

    expect(session.sessionId).toBe('fixed-session-id');
    expect(registry.size).toBe(1);
    expect(registry.get('fixed-session-id')).toBe(session);
  });

  it('releases opened GPIO on deleteAndCleanup', async () => {
    const port = createPortMock(26);
    const access: GpioAccess = {
      ports: new Map([[26, port]]),
      unexportAll: vi.fn(async () => {
        // no-op
      }),
    };
    const registry = createClientSessionRegistry(
      createRuntimeContextMock(access),
      {
        createSessionId: () => 'gpio-session',
        createGpioSession,
        createI2cSession,
      }
    );

    const session = registry.create();
    await session.gpio.open(26, 'out');
    expect(session.gpio.isOpen(26)).toBe(true);

    await registry.deleteAndCleanup('gpio-session');

    expect(registry.size).toBe(0);
    expect(registry.get('gpio-session')).toBeUndefined();
    expect(port.unexport).toHaveBeenCalledOnce();
    expect(session.gpio.isOpen(26)).toBe(false);
  });

  it('cleans up all sessions on cleanupAll', async () => {
    let nextId = 0;
    const registry = createClientSessionRegistry(createRuntimeContextMock(), {
      createSessionId: () => `session-${nextId++}`,
    });

    const first = registry.create();
    const second = registry.create();
    const firstCleanup = vi.spyOn(first, 'cleanup');
    const secondCleanup = vi.spyOn(second, 'cleanup');

    await registry.cleanupAll();

    expect(registry.size).toBe(0);
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
  });

  it('stops GPIO input watch on cleanupAll', async () => {
    const port = createPortMock(5);
    const access: GpioAccess = {
      ports: new Map([[5, port]]),
      unexportAll: vi.fn(async () => {
        // no-op
      }),
    };
    const registry = createClientSessionRegistry(
      createRuntimeContextMock(access),
      {
        createSessionId: () => 'gpio-input-shutdown',
        createGpioSession,
        createI2cSession,
      }
    );

    const session = registry.create();
    await session.gpio.open(5, 'in');
    await session.gpio.subscribe(5, vi.fn());
    expect(port.onchange).toEqual(expect.any(Function));

    await registry.cleanupAll();

    expect(port.onchange).toBeNull();
    expect(port.unexport).toHaveBeenCalledOnce();
    expect(session.gpio.isOpen(5)).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('is idempotent when deleting an unknown session', async () => {
    const registry = createClientSessionRegistry(createRuntimeContextMock());

    await expect(
      registry.deleteAndCleanup('missing')
    ).resolves.toBeUndefined();
  });
});

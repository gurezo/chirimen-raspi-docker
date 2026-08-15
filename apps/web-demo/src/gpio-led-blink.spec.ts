import { ChirimenError } from 'core';
import type { GpioAccess, GpioPort, GpioPortNumber, GpioValue } from 'gpio';
import { CHIRIMEN_GPIO_PORTS } from 'browser-polyfill';
import {
  LED_BLINK_GPIO_PORT,
  LED_BLINK_INTERVAL_MS,
  LedBlinkSession,
} from './gpio-led-blink.js';

type FakeGpioPort = GpioPort & { readonly calls: string[] };

function createFakePort(): FakeGpioPort {
  const calls: string[] = [];
  const port: GpioPort = {
    portNumber: LED_BLINK_GPIO_PORT,
    portName: `GPIO${LED_BLINK_GPIO_PORT}`,
    pinName: `PIN${LED_BLINK_GPIO_PORT}`,
    exported: true,
    direction: 'out',
    onchange: null,
    async export(direction) {
      calls.push(`export:${direction}`);
    },
    async unexport() {
      calls.push('unexport');
    },
    async read() {
      return 0;
    },
    async write(value: GpioValue) {
      calls.push(`write:${value}`);
    },
  };
  return Object.assign(port, { calls });
}

function installFakeGpioAccess(
  port: GpioPort | undefined
): ReturnType<typeof vi.fn> {
  const ports = new Map<GpioPortNumber, GpioPort>();
  if (port !== undefined) {
    ports.set(LED_BLINK_GPIO_PORT, port);
  }

  const access: GpioAccess = {
    ports,
    async unexportAll() {
      // unused in Blink session
    },
  };

  const requestGPIOAccess = vi.fn(async () => access);
  Object.defineProperty(globalThis, 'navigator', {
    value: { requestGPIOAccess },
    configurable: true,
    writable: true,
  });
  return requestGPIOAccess;
}

describe('LED Blink GPIO port', () => {
  it('uses BCM 26 as the circuit pin', () => {
    expect(LED_BLINK_GPIO_PORT).toBe(26);
  });

  it('is included in CHIRIMEN polyfill GPIO ports', () => {
    expect(CHIRIMEN_GPIO_PORTS).toContain(LED_BLINK_GPIO_PORT);
  });
});

describe('LedBlinkSession', () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'navigator');
  });

  it('exports output then writes 1 on start', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new LedBlinkSession();

    await session.start();

    expect(port.calls).toEqual(['export:out', 'write:1']);
    expect(session.running).toBe(true);
    expect(session.value).toBe(1);
  });

  it('alternates write(0) and write(1) every blink interval', async () => {
    vi.useFakeTimers();
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new LedBlinkSession();

    await session.start();
    await vi.advanceTimersByTimeAsync(LED_BLINK_INTERVAL_MS);
    expect(port.calls).toEqual(['export:out', 'write:1', 'write:0']);
    expect(session.value).toBe(0);

    await vi.advanceTimersByTimeAsync(LED_BLINK_INTERVAL_MS);
    expect(port.calls).toEqual(['export:out', 'write:1', 'write:0', 'write:1']);
    expect(session.value).toBe(1);

    await session.stop();
  });

  it('stops the interval, writes 0, and unexports on stop', async () => {
    vi.useFakeTimers();
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new LedBlinkSession();

    await session.start();
    await session.stop();

    expect(port.calls).toEqual(['export:out', 'write:1', 'write:0', 'unexport']);
    expect(session.running).toBe(false);
    expect(session.value).toBe(0);

    await vi.advanceTimersByTimeAsync(LED_BLINK_INTERVAL_MS * 2);
    expect(port.calls).toEqual(['export:out', 'write:1', 'write:0', 'unexport']);
  });

  it('can start again on the same port after stop unexports', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new LedBlinkSession();

    await session.start();
    await session.stop();
    await session.start();

    expect(port.calls).toEqual([
      'export:out',
      'write:1',
      'write:0',
      'unexport',
      'export:out',
      'write:1',
    ]);
    expect(session.running).toBe(true);

    await session.stop();
  });

  it('does not export twice when start is called while running', async () => {
    const port = createFakePort();
    const requestGPIOAccess = installFakeGpioAccess(port);
    const session = new LedBlinkSession();

    await session.start();
    await session.start();

    expect(requestGPIOAccess).toHaveBeenCalledTimes(1);
    expect(port.calls.filter((call) => call.startsWith('export:'))).toEqual([
      'export:out',
    ]);

    await session.stop();
  });

  it('throws when the GPIO port is missing', async () => {
    installFakeGpioAccess(undefined);
    const session = new LedBlinkSession();

    await expect(session.start()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: `GPIO port ${LED_BLINK_GPIO_PORT} is not available`,
    });
    expect(session.running).toBe(false);
  });

  it('is a no-op when stop is called before start', async () => {
    const session = new LedBlinkSession();
    await expect(session.stop()).resolves.toBeUndefined();
    expect(session.running).toBe(false);
  });

  it('throws when navigator.requestGPIOAccess is missing', async () => {
    const session = new LedBlinkSession();
    await expect(session.start()).rejects.toBeInstanceOf(ChirimenError);
  });
});

import { ChirimenError } from 'core';
import type {
  GpioAccess,
  GpioChangeEventHandler,
  GpioPort,
  GpioPortNumber,
  GpioValue,
} from 'gpio';
import { CHIRIMEN_GPIO_PORTS } from 'browser-polyfill';
import { GPIO_INPUT_PORT, GpioInputSession } from './gpio-input.js';
import { LED_BLINK_GPIO_PORT } from './gpio-led-blink.js';

type FakeGpioPort = GpioPort & {
  readonly calls: string[];
  readValue: GpioValue;
  readError: Error | null;
  onchangeError: Error | null;
};

function createFakePort(): FakeGpioPort {
  const calls: string[] = [];
  let onchange: GpioChangeEventHandler | null = null;
  const fake: FakeGpioPort = {
    portNumber: GPIO_INPUT_PORT,
    portName: `GPIO${GPIO_INPUT_PORT}`,
    pinName: `PIN${GPIO_INPUT_PORT}`,
    exported: true,
    direction: 'in',
    get onchange() {
      return onchange;
    },
    set onchange(handler) {
      if (handler !== null && fake.onchangeError !== null) {
        throw fake.onchangeError;
      }
      onchange = handler;
    },
    calls,
    readValue: 1,
    readError: null,
    onchangeError: null,
    async export(direction) {
      calls.push(`export:${direction}`);
    },
    async unexport() {
      calls.push('unexport');
    },
    async read() {
      calls.push('read');
      if (fake.readError !== null) {
        throw fake.readError;
      }
      return fake.readValue;
    },
    async write(value: GpioValue) {
      calls.push(`write:${value}`);
    },
  };
  return fake;
}

function installFakeGpioAccess(
  port: GpioPort | undefined
): ReturnType<typeof vi.fn> {
  const ports = new Map<GpioPortNumber, GpioPort>();
  if (port !== undefined) {
    ports.set(GPIO_INPUT_PORT, port);
  }

  const access: GpioAccess = {
    ports,
    async unexportAll() {
      // unused in Input session
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

describe('GPIO Input port', () => {
  it('uses BCM 5 as the circuit pin', () => {
    expect(GPIO_INPUT_PORT).toBe(5);
  });

  it('is included in CHIRIMEN polyfill GPIO ports', () => {
    expect(CHIRIMEN_GPIO_PORTS).toContain(GPIO_INPUT_PORT);
  });

  it('does not reuse the LED Blink output pin', () => {
    expect(GPIO_INPUT_PORT).not.toBe(LED_BLINK_GPIO_PORT);
  });
});

describe('GpioInputSession', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'navigator');
  });

  it('exports input then reads the current value on start', async () => {
    const port = createFakePort();
    port.readValue = 1;
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();

    expect(port.calls).toEqual(['export:in', 'read']);
    expect(session.running).toBe(true);
    expect(session.value).toBe(1);
  });

  it('reads again when readValue is called while running', async () => {
    const port = createFakePort();
    port.readValue = 1;
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();
    port.readValue = 0;
    await session.readValue();

    expect(port.calls).toEqual(['export:in', 'read', 'read']);
    expect(session.value).toBe(0);

    await session.stop();
  });

  it('does not read when readValue is called before start', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.readValue();

    expect(port.calls).toEqual([]);
    expect(session.running).toBe(false);
  });

  it('unexports on stop', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();
    await session.stop();

    expect(port.calls).toEqual(['export:in', 'read', 'unexport']);
    expect(session.running).toBe(false);
    expect(session.value).toBe(0);
  });

  it('can start again on the same port after stop unexports', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();
    await session.stop();
    await session.start();

    expect(port.calls).toEqual([
      'export:in',
      'read',
      'unexport',
      'export:in',
      'read',
    ]);
    expect(session.running).toBe(true);

    await session.stop();
  });

  it('does not export twice when start is called while running', async () => {
    const port = createFakePort();
    const requestGPIOAccess = installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();
    await session.start();

    expect(requestGPIOAccess).toHaveBeenCalledTimes(1);
    expect(port.calls.filter((call) => call.startsWith('export:'))).toEqual([
      'export:in',
    ]);

    await session.stop();
  });

  it('unexports and throws when the initial read fails', async () => {
    const port = createFakePort();
    port.readError = new ChirimenError('Operation', 'read failed');
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await expect(session.start()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'Operation',
      message: 'read failed',
    });
    expect(port.calls).toEqual(['export:in', 'read', 'unexport']);
    expect(session.running).toBe(false);
  });

  it('throws when the GPIO port is missing', async () => {
    installFakeGpioAccess(undefined);
    const session = new GpioInputSession();

    await expect(session.start()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: `GPIO port ${GPIO_INPUT_PORT} is not available`,
    });
    expect(session.running).toBe(false);
  });

  it('is a no-op when stop is called before start', async () => {
    const session = new GpioInputSession();
    await expect(session.stop()).resolves.toBeUndefined();
    expect(session.running).toBe(false);
  });

  it('throws when navigator.requestGPIOAccess is missing', async () => {
    const session = new GpioInputSession();
    await expect(session.start()).rejects.toBeInstanceOf(ChirimenError);
  });

  it('subscribes onchange after start and updates value from events', async () => {
    const port = createFakePort();
    port.readValue = 1;
    installFakeGpioAccess(port);
    const onValue = vi.fn();
    const session = new GpioInputSession({ onValue });

    await session.start();

    expect(port.onchange).toEqual(expect.any(Function));
    expect(session.value).toBe(1);

    port.onchange?.({ value: 0, portNumber: GPIO_INPUT_PORT });

    expect(session.value).toBe(0);
    expect(onValue).toHaveBeenCalledWith(0);
    expect(port.calls).toEqual(['export:in', 'read']);

    await session.stop();
  });

  it('unsubscribes onchange on stop and ignores later events', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const onValue = vi.fn();
    const session = new GpioInputSession({ onValue });

    await session.start();
    const handler = port.onchange;
    await session.stop();

    expect(port.onchange).toBeNull();
    expect(port.calls).toEqual(['export:in', 'read', 'unexport']);

    onValue.mockClear();
    handler?.({ value: 1, portNumber: GPIO_INPUT_PORT });
    expect(session.value).toBe(0);
    expect(onValue).not.toHaveBeenCalled();
  });

  it('keeps the onchange handler while running after reconnect', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await session.start();
    const handler = port.onchange;
    expect(handler).toEqual(expect.any(Function));
    expect(port.onchange).toBe(handler);

    port.onchange?.({ value: 0, portNumber: GPIO_INPUT_PORT });
    expect(session.value).toBe(0);
    expect(session.running).toBe(true);

    await session.stop();
  });

  it('unexports and throws when onchange subscription fails', async () => {
    const port = createFakePort();
    port.onchangeError = new ChirimenError('InvalidAccess', 'not exported');
    installFakeGpioAccess(port);
    const session = new GpioInputSession();

    await expect(session.start()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'not exported',
    });
    expect(port.calls).toEqual(['export:in', 'read', 'unexport']);
    expect(port.onchange).toBeNull();
    expect(session.running).toBe(false);
  });
});

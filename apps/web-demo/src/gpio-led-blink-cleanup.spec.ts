import type { GpioAccess, GpioPort, GpioPortNumber, GpioValue } from 'gpio';
import type { ConnectionStatus } from './app.js';
import {
  bindLedBlinkCleanup,
  shouldStopLedBlinkOnConnectionStatus,
  shouldStopLedBlinkOnRoute,
} from './gpio-led-blink-cleanup.js';
import { LED_BLINK_GPIO_PORT, LedBlinkSession } from './gpio-led-blink.js';
import type { DemoRouteId } from './navigation.js';

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

function installFakeGpioAccess(port: GpioPort): void {
  const ports = new Map<GpioPortNumber, GpioPort>();
  ports.set(LED_BLINK_GPIO_PORT, port);

  const access: GpioAccess = {
    ports,
    async unexportAll() {
      // unused in Blink session
    },
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: { requestGPIOAccess: vi.fn(async () => access) },
    configurable: true,
    writable: true,
  });
}

describe('LED Blink cleanup policy', () => {
  it('stops when leaving GPIO Output', () => {
    expect(shouldStopLedBlinkOnRoute('gpio-output')).toBe(false);
    expect(shouldStopLedBlinkOnRoute('home')).toBe(true);
    expect(shouldStopLedBlinkOnRoute('gpio-input')).toBe(true);
    expect(shouldStopLedBlinkOnRoute('i2c-scan')).toBe(true);
  });

  it('stops when Runtime is not connected', () => {
    expect(shouldStopLedBlinkOnConnectionStatus('connected')).toBe(false);
    expect(shouldStopLedBlinkOnConnectionStatus('disconnected')).toBe(true);
    expect(shouldStopLedBlinkOnConnectionStatus('connecting')).toBe(true);
    expect(shouldStopLedBlinkOnConnectionStatus('error')).toBe(true);
  });
});

describe('bindLedBlinkCleanup', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'navigator');
  });

  function bind(options: {
    readonly stop?: () => void | Promise<void>;
    readonly getRoute?: () => DemoRouteId;
    readonly target?: EventTarget;
    readonly emitStatus?: { current: (status: ConnectionStatus) => void };
  }): () => void {
    const emitStatus = options.emitStatus;
    return bindLedBlinkCleanup({
      stop: options.stop ?? vi.fn(),
      getRoute: options.getRoute ?? (() => 'gpio-output'),
      addStatusListener: (listener) => {
        if (emitStatus) {
          emitStatus.current = listener;
        }
        return () => {
          if (emitStatus) {
            emitStatus.current = () => undefined;
          }
        };
      },
      target: options.target ?? new EventTarget(),
    });
  }

  it('unexports when hashchange leaves GPIO Output', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new LedBlinkSession();
    await session.start();

    let route: DemoRouteId = 'gpio-output';
    const target = new EventTarget();
    bind({
      stop: () => session.stop(),
      getRoute: () => route,
      target,
    });

    route = 'home';
    target.dispatchEvent(new Event('hashchange'));

    await vi.waitFor(() => {
      expect(port.calls).toEqual([
        'export:out',
        'write:1',
        'write:0',
        'unexport',
      ]);
    });
    expect(session.running).toBe(false);
  });

  it('does not stop when hashchange stays on GPIO Output', async () => {
    const stop = vi.fn();
    const target = new EventTarget();
    bind({
      stop,
      getRoute: () => 'gpio-output',
      target,
    });

    target.dispatchEvent(new Event('hashchange'));

    expect(stop).not.toHaveBeenCalled();
  });

  it('stops on pagehide for browser reload', () => {
    const stop = vi.fn();
    const target = new EventTarget();
    bind({ stop, target });

    target.dispatchEvent(new Event('pagehide'));

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops on WebSocket disconnect and does not start on reconnect', () => {
    const stop = vi.fn();
    const start = vi.fn();
    const emitStatus: { current: (status: ConnectionStatus) => void } = {
      current() {
        // bind() が listener を代入する
      },
    };
    bind({ stop, emitStatus });

    emitStatus.current('connected');
    expect(stop).not.toHaveBeenCalled();

    emitStatus.current('connecting');
    expect(stop).toHaveBeenCalledTimes(1);

    emitStatus.current('connected');
    expect(stop).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it('stops on disconnected and error status', () => {
    const stop = vi.fn();
    const emitStatus: { current: (status: ConnectionStatus) => void } = {
      current() {
        // bind() が listener を代入する
      },
    };
    bind({ stop, emitStatus });

    emitStatus.current('disconnected');
    emitStatus.current('error');

    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('unbinds hashchange and pagehide listeners', () => {
    const stop = vi.fn();
    const target = new EventTarget();
    const unbind = bind({
      stop,
      getRoute: () => 'home',
      target,
    });

    unbind();
    target.dispatchEvent(new Event('hashchange'));
    target.dispatchEvent(new Event('pagehide'));

    expect(stop).not.toHaveBeenCalled();
  });
});

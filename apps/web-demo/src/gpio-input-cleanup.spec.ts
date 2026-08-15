import type {
  GpioAccess,
  GpioChangeEventHandler,
  GpioPort,
  GpioPortNumber,
  GpioValue,
} from 'gpio';
import type { ConnectionStatus } from './app.js';
import {
  bindGpioInputCleanup,
  shouldStopGpioInputOnConnectionStatus,
  shouldStopGpioInputOnRoute,
} from './gpio-input-cleanup.js';
import { GPIO_INPUT_PORT, GpioInputSession } from './gpio-input.js';
import type { DemoRouteId } from './navigation.js';

type FakeGpioPort = GpioPort & {
  readonly calls: string[];
  readValue: GpioValue;
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
      onchange = handler;
    },
    calls,
    readValue: 1,
    async export(direction) {
      calls.push(`export:${direction}`);
    },
    async unexport() {
      calls.push('unexport');
    },
    async read() {
      calls.push('read');
      return fake.readValue;
    },
    async write(value: GpioValue) {
      calls.push(`write:${value}`);
    },
  };
  return fake;
}

function installFakeGpioAccess(port: GpioPort): void {
  const ports = new Map<GpioPortNumber, GpioPort>();
  ports.set(GPIO_INPUT_PORT, port);

  const access: GpioAccess = {
    ports,
    async unexportAll() {
      // unused in Input session
    },
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: { requestGPIOAccess: vi.fn(async () => access) },
    configurable: true,
    writable: true,
  });
}

describe('GPIO Input cleanup policy', () => {
  it('stops when leaving GPIO Input', () => {
    expect(shouldStopGpioInputOnRoute('gpio-input')).toBe(false);
    expect(shouldStopGpioInputOnRoute('home')).toBe(true);
    expect(shouldStopGpioInputOnRoute('gpio-output')).toBe(true);
    expect(shouldStopGpioInputOnRoute('i2c-scan')).toBe(true);
  });

  it('stops when Runtime is not connected', () => {
    expect(shouldStopGpioInputOnConnectionStatus('connected')).toBe(false);
    expect(shouldStopGpioInputOnConnectionStatus('disconnected')).toBe(true);
    expect(shouldStopGpioInputOnConnectionStatus('connecting')).toBe(true);
    expect(shouldStopGpioInputOnConnectionStatus('error')).toBe(true);
  });
});

describe('bindGpioInputCleanup', () => {
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
    return bindGpioInputCleanup({
      stop: options.stop ?? vi.fn(),
      getRoute: options.getRoute ?? (() => 'gpio-input'),
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

  it('unsubscribes and unexports when hashchange leaves GPIO Input', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const session = new GpioInputSession();
    await session.start();
    expect(port.onchange).toEqual(expect.any(Function));

    let route: DemoRouteId = 'gpio-input';
    const target = new EventTarget();
    bind({
      stop: () => session.stop(),
      getRoute: () => route,
      target,
    });

    route = 'home';
    target.dispatchEvent(new Event('hashchange'));

    await vi.waitFor(() => {
      expect(port.onchange).toBeNull();
      expect(port.calls).toEqual(['export:in', 'read', 'unexport']);
    });
    expect(session.running).toBe(false);
  });

  it('does not stop when hashchange stays on GPIO Input', async () => {
    const stop = vi.fn();
    const target = new EventTarget();
    bind({
      stop,
      getRoute: () => 'gpio-input',
      target,
    });

    target.dispatchEvent(new Event('hashchange'));

    expect(stop).not.toHaveBeenCalled();
  });

  it('unsubscribes on stop and can export the same GPIO5 again', async () => {
    const port = createFakePort();
    installFakeGpioAccess(port);
    const onValue = vi.fn();
    const session = new GpioInputSession({ onValue });

    await session.start();
    const handler = port.onchange;
    expect(handler).toEqual(expect.any(Function));

    await session.stop();

    expect(port.onchange).toBeNull();
    expect(port.calls).toEqual(['export:in', 'read', 'unexport']);

    onValue.mockClear();
    handler?.({ value: 0, portNumber: GPIO_INPUT_PORT });
    expect(session.value).toBe(0);
    expect(onValue).not.toHaveBeenCalled();

    await session.start();
    expect(port.calls).toEqual([
      'export:in',
      'read',
      'unexport',
      'export:in',
      'read',
    ]);
    expect(session.running).toBe(true);
    expect(port.onchange).toEqual(expect.any(Function));

    await session.stop();
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

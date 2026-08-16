import type { I2CAccess, I2CPort, I2CPortNumber, I2CSlaveDevice } from 'i2c';
import type { ConnectionStatus } from './app.js';
import {
  bindI2cScanCleanup,
  shouldStopI2cScanOnConnectionStatus,
  shouldStopI2cScanOnRoute,
} from './i2c-scan-cleanup.js';
import { I2C_SCAN_PORT, I2cScanSession } from './i2c-scan.js';
import type { DemoRouteId } from './navigation.js';

type FakeI2cPort = I2CPort & {
  responding: Set<number>;
};

function createFakePort(): FakeI2cPort {
  const fake: FakeI2cPort = {
    portNumber: I2C_SCAN_PORT,
    portName: `I2C${I2C_SCAN_PORT}`,
    pinName: `PIN${I2C_SCAN_PORT}`,
    responding: new Set(),
    async open(slaveAddress) {
      if (!fake.responding.has(slaveAddress)) {
        throw new Error(`no device at ${slaveAddress}`);
      }
      const device: I2CSlaveDevice = {
        slaveAddress,
        read8: vi.fn(async () => 0),
        read16: vi.fn(async () => 0),
        write8: vi.fn(async () => {
          // unused
        }),
        write16: vi.fn(async () => {
          // unused
        }),
        readByte: vi.fn(async () => 0),
        writeByte: vi.fn(async () => {
          // probe success
        }),
        readBytes: vi.fn(async () => new Uint8Array()),
        writeBytes: vi.fn(async (bytes) => new Uint8Array(bytes)),
      };
      return device;
    },
  };
  return fake;
}

function installFakeI2cAccess(port: I2CPort): void {
  const ports = new Map<I2CPortNumber, I2CPort>();
  ports.set(I2C_SCAN_PORT, port);
  const access: I2CAccess = { ports };
  Object.defineProperty(globalThis, 'navigator', {
    value: { requestI2CAccess: vi.fn(async () => access) },
    configurable: true,
    writable: true,
  });
}

describe('I2C Scan cleanup policy', () => {
  it('stops when leaving I2C Scan', () => {
    expect(shouldStopI2cScanOnRoute('i2c-scan')).toBe(false);
    expect(shouldStopI2cScanOnRoute('home')).toBe(true);
    expect(shouldStopI2cScanOnRoute('gpio-output')).toBe(true);
    expect(shouldStopI2cScanOnRoute('gpio-input')).toBe(true);
  });

  it('stops when Runtime is not connected', () => {
    expect(shouldStopI2cScanOnConnectionStatus('connected')).toBe(false);
    expect(shouldStopI2cScanOnConnectionStatus('disconnected')).toBe(true);
    expect(shouldStopI2cScanOnConnectionStatus('connecting')).toBe(true);
    expect(shouldStopI2cScanOnConnectionStatus('error')).toBe(true);
  });
});

describe('bindI2cScanCleanup', () => {
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
    return bindI2cScanCleanup({
      stop: options.stop ?? vi.fn(),
      getRoute: options.getRoute ?? (() => 'i2c-scan'),
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

  it('discards scan results when hashchange leaves I2C Scan', async () => {
    const port = createFakePort();
    port.responding = new Set([0x48]);
    installFakeI2cAccess(port);
    const session = new I2cScanSession();
    await session.scan();
    expect(session.completed).toBe(true);
    expect(session.addresses).toEqual([0x48]);

    let route: DemoRouteId = 'i2c-scan';
    const target = new EventTarget();
    bind({
      stop: () => session.stop(),
      getRoute: () => route,
      target,
    });

    route = 'home';
    target.dispatchEvent(new Event('hashchange'));

    await vi.waitFor(() => {
      expect(session.completed).toBe(false);
      expect(session.addresses).toEqual([]);
    });
    expect(session.scanning).toBe(false);
  });

  it('does not stop when hashchange stays on I2C Scan', () => {
    const stop = vi.fn();
    const target = new EventTarget();
    bind({
      stop,
      getRoute: () => 'i2c-scan',
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

  it('stops on WebSocket disconnect and does not scan on reconnect', () => {
    const stop = vi.fn();
    const scan = vi.fn();
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
    expect(scan).not.toHaveBeenCalled();
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

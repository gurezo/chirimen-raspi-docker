import { ChirimenError } from 'core';
import type { I2CAccess, I2CPort, I2CPortNumber, I2CSlaveDevice } from 'i2c';
import { CHIRIMEN_I2C_PORTS } from 'browser-polyfill';
import {
  I2C_SCAN_ADDRESS_MAX,
  I2C_SCAN_ADDRESS_MIN,
  I2C_SCAN_PORT,
  I2cScanSession,
  formatI2cSlaveAddress,
} from './i2c-scan.js';

type FakeI2cPort = I2CPort & {
  readonly opened: number[];
  readonly writeByteCalls: number[];
  responding: Set<number>;
  writeByteFails: Set<number>;
  holdOpen: ((release: () => void) => void) | null;
};

function createFakeSlaveDevice(
  slaveAddress: number,
  port: FakeI2cPort
): I2CSlaveDevice {
  return {
    slaveAddress,
    read8: vi.fn(async () => 0),
    read16: vi.fn(async () => 0),
    write8: vi.fn(async () => {
      // unused in scan
    }),
    write16: vi.fn(async () => {
      // unused in scan
    }),
    readByte: vi.fn(async () => 0),
    writeByte: vi.fn(async (byte: number) => {
      port.writeByteCalls.push(slaveAddress);
      if (port.writeByteFails.has(slaveAddress)) {
        throw new Error(`writeByte failed at 0x${slaveAddress.toString(16)}`);
      }
      void byte;
    }),
    readBytes: vi.fn(async () => new Uint8Array()),
    writeBytes: vi.fn(async (bytes) => new Uint8Array(bytes)),
  };
}

function createFakePort(): FakeI2cPort {
  const fake: FakeI2cPort = {
    portNumber: I2C_SCAN_PORT,
    portName: `I2C${I2C_SCAN_PORT}`,
    pinName: `PIN${I2C_SCAN_PORT}`,
    opened: [],
    writeByteCalls: [],
    responding: new Set(),
    writeByteFails: new Set(),
    holdOpen: null,
    async open(slaveAddress) {
      if (fake.holdOpen) {
        await new Promise<void>((resolve) => {
          fake.holdOpen?.(resolve);
        });
      }
      fake.opened.push(slaveAddress);
      if (!fake.responding.has(slaveAddress)) {
        throw new Error(`no device at 0x${slaveAddress.toString(16)}`);
      }
      return createFakeSlaveDevice(slaveAddress, fake);
    },
  };
  return fake;
}

function installFakeI2cAccess(
  port: I2CPort | undefined
): ReturnType<typeof vi.fn> {
  const ports = new Map<I2CPortNumber, I2CPort>();
  if (port !== undefined) {
    ports.set(I2C_SCAN_PORT, port);
  }

  const access: I2CAccess = { ports };
  const requestI2CAccess = vi.fn(async () => access);
  Object.defineProperty(globalThis, 'navigator', {
    value: { requestI2CAccess },
    configurable: true,
    writable: true,
  });
  return requestI2CAccess;
}

describe('I2C Scan port and address range', () => {
  it('uses CHIRIMEN I2C bus 1', () => {
    expect(I2C_SCAN_PORT).toBe(1);
    expect(CHIRIMEN_I2C_PORTS).toContain(I2C_SCAN_PORT);
  });

  it('scans 0x03 through 0x77 inclusive', () => {
    expect(I2C_SCAN_ADDRESS_MIN).toBe(0x03);
    expect(I2C_SCAN_ADDRESS_MAX).toBe(0x77);
  });
});

describe('formatI2cSlaveAddress', () => {
  it('formats addresses as two-digit hex', () => {
    expect(formatI2cSlaveAddress(0x03)).toBe('0x03');
    expect(formatI2cSlaveAddress(0x48)).toBe('0x48');
    expect(formatI2cSlaveAddress(0x77)).toBe('0x77');
  });
});

describe('I2cScanSession', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'navigator');
  });

  it('returns responding addresses from open + writeByte', async () => {
    const port = createFakePort();
    port.responding = new Set([0x03, 0x48, 0x77]);
    installFakeI2cAccess(port);
    const session = new I2cScanSession();

    await session.scan();

    expect(session.addresses).toEqual([0x03, 0x48, 0x77]);
    expect(session.scanning).toBe(false);
    expect(port.opened[0]).toBe(I2C_SCAN_ADDRESS_MIN);
    expect(port.opened.at(-1)).toBe(I2C_SCAN_ADDRESS_MAX);
    expect(port.opened).toHaveLength(
      I2C_SCAN_ADDRESS_MAX - I2C_SCAN_ADDRESS_MIN + 1
    );
    expect(port.writeByteCalls).toEqual([0x03, 0x48, 0x77]);
  });

  it('ignores addresses that fail open or writeByte', async () => {
    const port = createFakePort();
    port.responding = new Set([0x48, 0x49]);
    port.writeByteFails = new Set([0x49]);
    installFakeI2cAccess(port);
    const session = new I2cScanSession();

    await session.scan();

    expect(session.addresses).toEqual([0x48]);
  });

  it('does not scan twice when scan is called while scanning', async () => {
    const port = createFakePort();
    port.responding = new Set([0x48]);
    const requestI2CAccess = installFakeI2cAccess(port);
    const session = new I2cScanSession();

    const first = session.scan();
    const second = session.scan();
    await Promise.all([first, second]);

    expect(requestI2CAccess).toHaveBeenCalledTimes(1);
    expect(session.addresses).toEqual([0x48]);
  });

  it('throws when the I2C port is missing', async () => {
    installFakeI2cAccess(undefined);
    const session = new I2cScanSession();

    await expect(session.scan()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: `I2C port ${I2C_SCAN_PORT} is not available`,
    });
    expect(session.scanning).toBe(false);
    expect(session.addresses).toEqual([]);
  });

  it('throws when navigator.requestI2CAccess is missing', async () => {
    const session = new I2cScanSession();
    await expect(session.scan()).rejects.toBeInstanceOf(ChirimenError);
  });

  it('discards in-flight results when stop interrupts a scan', async () => {
    const port = createFakePort();
    port.responding = new Set([0x03, 0x48]);
    let releaseOpen: (() => void) | undefined;
    port.holdOpen = (release) => {
      if (port.opened.length === 0) {
        release();
        return;
      }
      releaseOpen = release;
    };
    installFakeI2cAccess(port);
    const session = new I2cScanSession();

    const scanPromise = session.scan();
    await vi.waitFor(() => {
      expect(releaseOpen).toBeTypeOf('function');
    });
    expect(session.scanning).toBe(true);
    expect(session.addresses).toEqual([0x03]);

    const stopPromise = session.stop();
    releaseOpen?.();
    await stopPromise;
    await scanPromise;

    expect(session.scanning).toBe(false);
    expect(session.addresses).toEqual([]);
  });

  it('is a no-op when stop is called before scan', async () => {
    const session = new I2cScanSession();
    await expect(session.stop()).resolves.toBeUndefined();
    expect(session.scanning).toBe(false);
    expect(session.addresses).toEqual([]);
  });
});

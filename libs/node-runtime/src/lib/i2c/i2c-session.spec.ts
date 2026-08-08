import type { I2CAccess, I2CPort, I2CSlaveDevice } from 'i2c';
import { OperationError } from 'node-web-i2c';
import { describe, expect, it, vi } from 'vitest';
import { createI2cSession } from './i2c-session.js';

const { MockOperationError } = vi.hoisted(() => {
  class MockOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OperationError';
    }
  }

  return { MockOperationError };
});

vi.mock('node-web-i2c', () => ({
  OperationError: MockOperationError,
}));

function createSlaveDeviceMock(slaveAddress: number): I2CSlaveDevice {
  return {
    slaveAddress,
    read8: vi.fn(async () => 0x12),
    read16: vi.fn(async () => 0x1234),
    write8: vi.fn(async () => {
      // no-op for unit tests
    }),
    write16: vi.fn(async () => {
      // no-op for unit tests
    }),
    readByte: vi.fn(async () => 0),
    writeByte: vi.fn(async () => {
      // no-op for unit tests
    }),
    readBytes: vi.fn(async () => new Uint8Array()),
    writeBytes: vi.fn(async (bytes) => new Uint8Array(bytes)),
  };
}

function createPortMock(portNumber: number): I2CPort {
  return {
    portNumber,
    portName: `I2C${portNumber}`,
    pinName: '',
    open: vi.fn(async (slaveAddress: number) =>
      createSlaveDeviceMock(slaveAddress)
    ),
  };
}

function createAccessMock(ports: Map<number, I2CPort>): I2CAccess {
  return { ports };
}

describe('I2cSession', () => {
  it('opens a slave device and tracks it', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    const device = await session.open(1, 0x48);

    expect(port.open).toHaveBeenCalledWith(0x48);
    expect(device.slaveAddress).toBe(0x48);
    expect(session.isOpen(1, 0x48)).toBe(true);
  });

  it('rejects invalid port number', async () => {
    const session = createI2cSession(createAccessMock(new Map()));

    await expect(session.open(-1, 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(session.open('1', 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
  });

  it('rejects invalid slave address', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await expect(session.open(1, 0x80)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(session.open(1, '0x48')).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(port.open).not.toHaveBeenCalled();
  });

  it('rejects missing port', async () => {
    const session = createI2cSession(
      createAccessMock(new Map([[1, createPortMock(1)]]))
    );

    await expect(session.open(2, 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'I2C port 2 is not available',
    });
  });

  it('rejects duplicate open in the same session', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await session.open(1, 0x48);

    await expect(session.open(1, 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
      message: 'I2C device 72 on port 1 is already open in this session',
    });
    expect(port.open).toHaveBeenCalledTimes(1);
  });

  it('allows the same address on a different port', async () => {
    const port1 = createPortMock(1);
    const port2 = createPortMock(2);
    const session = createI2cSession(
      createAccessMock(
        new Map([
          [1, port1],
          [2, port2],
        ])
      )
    );

    await session.open(1, 0x48);
    await session.open(2, 0x48);

    expect(session.isOpen(1, 0x48)).toBe(true);
    expect(session.isOpen(2, 0x48)).toBe(true);
  });

  it('maps open failures to ChirimenError and does not track', async () => {
    const port = createPortMock(1);
    (port.open as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new OperationError('open failed')
    );
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await expect(session.open(1, 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'Operation',
      message: 'open failed',
    });
    expect(session.isOpen(1, 0x48)).toBe(false);
  });

  it('closes an open device and allows re-open', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await session.open(1, 0x48);
    await session.close(1, 0x48);

    expect(session.isOpen(1, 0x48)).toBe(false);

    await session.open(1, 0x48);
    expect(port.open).toHaveBeenCalledTimes(2);
    expect(session.isOpen(1, 0x48)).toBe(true);
  });

  it('treats close of unopened or already closed devices as no-op', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await expect(session.close(1, 0x48)).resolves.toBeUndefined();

    await session.open(1, 0x48);
    await session.close(1, 0x48);
    await expect(session.close(1, 0x48)).resolves.toBeUndefined();
    expect(session.isOpen(1, 0x48)).toBe(false);
  });

  it('rejects invalid port or address on close', async () => {
    const session = createI2cSession(createAccessMock(new Map()));

    await expect(session.close(-1, 0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(session.close(1, 0x80)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
  });

  it('closeAll clears all opened devices', async () => {
    const port = createPortMock(1);
    const session = createI2cSession(createAccessMock(new Map([[1, port]])));

    await session.open(1, 0x48);
    await session.open(1, 0x49);
    await session.closeAll();

    expect(session.isOpen(1, 0x48)).toBe(false);
    expect(session.isOpen(1, 0x49)).toBe(false);

    await session.open(1, 0x48);
    expect(session.isOpen(1, 0x48)).toBe(true);
  });
});

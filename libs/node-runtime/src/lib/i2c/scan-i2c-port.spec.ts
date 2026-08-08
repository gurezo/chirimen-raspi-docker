import type { I2CPort, I2CSlaveDevice } from 'i2c';
import { describe, expect, it, vi } from 'vitest';
import {
  I2C_SCAN_ADDRESS_MAX,
  I2C_SCAN_ADDRESS_MIN,
  scanI2cPort,
} from './scan-i2c-port.js';

function createSlaveDeviceMock(slaveAddress: number): I2CSlaveDevice {
  return {
    slaveAddress,
    read8: vi.fn(async () => 0),
    read16: vi.fn(async () => 0),
    write8: vi.fn(async () => {
      // no-op
    }),
    write16: vi.fn(async () => {
      // no-op
    }),
    readByte: vi.fn(async () => 0),
    writeByte: vi.fn(async () => {
      // no-op
    }),
    readBytes: vi.fn(async () => new Uint8Array()),
    writeBytes: vi.fn(async (bytes) => new Uint8Array(bytes)),
  };
}

describe('scanI2cPort', () => {
  it('exports the chirimen-server / i2cdetect user-space range', () => {
    expect(I2C_SCAN_ADDRESS_MIN).toBe(0x03);
    expect(I2C_SCAN_ADDRESS_MAX).toBe(0x77);
  });

  it('returns addresses that accept open and writeByte', async () => {
    const responding = new Set([0x03, 0x48, 0x77]);
    const port: I2CPort = {
      portNumber: 1,
      portName: 'I2C1',
      pinName: '',
      open: vi.fn(async (slaveAddress: number) => {
        if (!responding.has(slaveAddress)) {
          throw new Error(`no device at 0x${slaveAddress.toString(16)}`);
        }
        return createSlaveDeviceMock(slaveAddress);
      }),
    };

    await expect(scanI2cPort(port)).resolves.toEqual([0x03, 0x48, 0x77]);
    expect(port.open).toHaveBeenCalledTimes(
      I2C_SCAN_ADDRESS_MAX - I2C_SCAN_ADDRESS_MIN + 1
    );
    expect(port.open).toHaveBeenCalledWith(I2C_SCAN_ADDRESS_MIN);
    expect(port.open).toHaveBeenCalledWith(I2C_SCAN_ADDRESS_MAX);
  });

  it('ignores addresses where writeByte fails after open', async () => {
    const port: I2CPort = {
      portNumber: 1,
      portName: 'I2C1',
      pinName: '',
      open: vi.fn(async (slaveAddress: number) => {
        const device = createSlaveDeviceMock(slaveAddress);
        if (slaveAddress === 0x48) {
          (device.writeByte as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error('NACK')
          );
        } else if (slaveAddress !== 0x49) {
          throw new Error('no device');
        }
        return device;
      }),
    };

    await expect(scanI2cPort(port)).resolves.toEqual([0x49]);
  });

  it('returns an empty list when no device responds', async () => {
    const port: I2CPort = {
      portNumber: 1,
      portName: 'I2C1',
      pinName: '',
      open: vi.fn(async () => {
        throw new Error('no device');
      }),
    };

    await expect(scanI2cPort(port)).resolves.toEqual([]);
  });
});

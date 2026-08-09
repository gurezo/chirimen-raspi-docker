import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isI2CByte,
  isI2CBytesLength,
  isI2CPortNumber,
  isI2CRegisterNumber,
  isI2CSlaveAddress,
  isI2CWord,
  type I2CAccess,
  type I2CByte,
  type I2CPort,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
  type I2CWord,
} from '../index.js';

describe('i2c domain guards', () => {
  it('accepts non-negative integer port numbers', () => {
    expect(isI2CPortNumber(0)).toBe(true);
    expect(isI2CPortNumber(1)).toBe(true);
    expect(isI2CPortNumber(-1)).toBe(false);
    expect(isI2CPortNumber(1.5)).toBe(false);
  });

  it('accepts 7-bit slave addresses', () => {
    expect(isI2CSlaveAddress(0x00)).toBe(true);
    expect(isI2CSlaveAddress(0x48)).toBe(true);
    expect(isI2CSlaveAddress(0x7f)).toBe(true);
    expect(isI2CSlaveAddress(0x80)).toBe(false);
    expect(isI2CSlaveAddress(-1)).toBe(false);
  });

  it('accepts register numbers in 0–0xffff', () => {
    expect(isI2CRegisterNumber(0)).toBe(true);
    expect(isI2CRegisterNumber(0x10)).toBe(true);
    expect(isI2CRegisterNumber(0xffff)).toBe(true);
    expect(isI2CRegisterNumber(-1)).toBe(false);
    expect(isI2CRegisterNumber(0x10000)).toBe(false);
  });

  it('accepts byte and word values', () => {
    expect(isI2CByte(0)).toBe(true);
    expect(isI2CByte(0xff)).toBe(true);
    expect(isI2CByte(0x100)).toBe(false);
    expect(isI2CWord(0)).toBe(true);
    expect(isI2CWord(0xffff)).toBe(true);
    expect(isI2CWord(0x10000)).toBe(false);
  });

  it('accepts bytes length in 1–127', () => {
    expect(isI2CBytesLength(1)).toBe(true);
    expect(isI2CBytesLength(127)).toBe(true);
    expect(isI2CBytesLength(0)).toBe(false);
    expect(isI2CBytesLength(128)).toBe(false);
    expect(isI2CBytesLength(1.5)).toBe(false);
  });
});

describe('I2CPort / I2CSlaveDevice contract', () => {
  it('supports open, register, and byte operations via a mock port', async () => {
    const port = createMockI2CPort(1);
    const device = await port.open(0x48);

    expect(device.slaveAddress).toBe(0x48);

    await device.write8(0x03, 0x80);
    expect(await device.read8(0x03)).toBe(0x80);

    await device.write16(0x10, 0x1234);
    expect(await device.read16(0x10)).toBe(0x1234);

    await device.writeByte(0xaa);
    expect(await device.readByte()).toBe(0xaa);

    const written = await device.writeBytes([0x01, 0x02, 0x03]);
    expect(written).toEqual(new Uint8Array([0x01, 0x02, 0x03]));
    await expect(device.readBytes(3)).resolves.toEqual(
      new Uint8Array([0x01, 0x02, 0x03])
    );
  });
});

describe('I2CAccess contract', () => {
  it('exposes ports by port number', async () => {
    const port = createMockI2CPort(1);
    const access: I2CAccess = {
      ports: new Map([[1, port]]),
    };

    expect(access.ports.get(1)).toBe(port);
    const device = await access.ports.get(1)!.open(0x48);
    expect(device.slaveAddress).toBe(0x48);
  });
});

describe('i2c domain independence', () => {
  it('does not import Node hardware libraries', () => {
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
    const files = readdirSync(srcRoot, { recursive: true, encoding: 'utf8' }).filter(
      (name) => name.endsWith('.ts')
    );

    for (const relativePath of files) {
      const content = readFileSync(join(srcRoot, relativePath), 'utf8');
      expect(content, relativePath).not.toMatch(/from ['"]node-web-i2c['"]/);
      expect(content, relativePath).not.toMatch(/from ['"]i2c-bus['"]/);
    }
  });
});

function createMockI2CPort(portNumber: number): I2CPort {
  return {
    portNumber,
    get portName() {
      return `i2c-${portNumber}`;
    },
    get pinName() {
      return '';
    },
    async open(slaveAddress) {
      return createMockI2CSlaveDevice(slaveAddress);
    },
  };
}

function createMockI2CSlaveDevice(
  slaveAddress: I2CSlaveAddress
): I2CSlaveDevice {
  const registers8 = new Map<number, I2CByte>();
  const registers16 = new Map<number, I2CWord>();
  let lastByte: I2CByte = 0;
  let lastBytes = new Uint8Array();

  return {
    slaveAddress,
    async read8(registerNumber) {
      return registers8.get(registerNumber) ?? 0;
    },
    async read16(registerNumber) {
      return registers16.get(registerNumber) ?? 0;
    },
    async write8(registerNumber, value) {
      registers8.set(registerNumber, value);
    },
    async write16(registerNumber, value) {
      registers16.set(registerNumber, value);
    },
    async readByte() {
      return lastByte;
    },
    async writeByte(byte) {
      lastByte = byte;
    },
    async readBytes(length) {
      return lastBytes.slice(0, length);
    },
    async writeBytes(bytes) {
      lastBytes = new Uint8Array(bytes);
      return lastBytes;
    },
  };
}

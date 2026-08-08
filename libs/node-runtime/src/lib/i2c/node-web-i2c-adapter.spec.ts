import { OperationError } from 'node-web-i2c';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeWebI2CAccessAdapter } from './i2c-access-adapter.js';
import { NodeWebI2CPortAdapter } from './i2c-port-adapter.js';
import { NodeWebI2CSlaveDeviceAdapter } from './i2c-slave-device-adapter.js';
import { requestNodeI2CAccess } from './request-node-i2c-access.js';

const { requestI2CAccessMock, MockOperationError } = vi.hoisted(() => {
  class MockOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OperationError';
    }
  }

  return {
    requestI2CAccessMock: vi.fn(),
    MockOperationError,
  };
});

vi.mock('node-web-i2c', () => ({
  OperationError: MockOperationError,
  requestI2CAccess: requestI2CAccessMock,
}));

function createNativeSlaveDeviceMock(slaveAddress: number) {
  return {
    slaveAddress,
    read8: vi.fn(async () => 0x12),
    read16: vi.fn(async () => 0x1234),
    write8: vi.fn(async () => 0),
    write16: vi.fn(async () => 0),
    readByte: vi.fn(async () => 0),
    readBytes: vi.fn(async () => new Uint8Array()),
    writeByte: vi.fn(async () => 0),
    writeBytes: vi.fn(async () => new Uint8Array()),
  };
}

function createNativePortMock(portNumber: number) {
  return {
    portNumber,
    portName: `I2C${portNumber}`,
    open: vi.fn(async (slaveAddress: number) =>
      createNativeSlaveDeviceMock(slaveAddress)
    ),
  };
}

describe('NodeWebI2CSlaveDeviceAdapter', () => {
  it('delegates read8/read16/write8/write16 and maps values', async () => {
    const nativeDevice = createNativeSlaveDeviceMock(0x48);
    const device = new NodeWebI2CSlaveDeviceAdapter(nativeDevice as never);

    expect(device.slaveAddress).toBe(0x48);

    await expect(device.read8(0x01)).resolves.toBe(0x12);
    expect(nativeDevice.read8).toHaveBeenCalledWith(0x01);

    await expect(device.read16(0x02)).resolves.toBe(0x1234);
    expect(nativeDevice.read16).toHaveBeenCalledWith(0x02);

    await device.write8(0x03, 0xab);
    expect(nativeDevice.write8).toHaveBeenCalledWith(0x03, 0xab);

    await device.write16(0x04, 0xabcd);
    expect(nativeDevice.write16).toHaveBeenCalledWith(0x04, 0xabcd);
  });

  it('maps native errors through mapI2cError', async () => {
    const nativeDevice = createNativeSlaveDeviceMock(0x48);
    nativeDevice.read8.mockRejectedValueOnce(new OperationError('native failure'));
    const device = new NodeWebI2CSlaveDeviceAdapter(nativeDevice as never);

    await expect(device.read8(0x01)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'Operation',
      message: 'native failure',
    });
  });

  it('rejects invalid register numbers and values', async () => {
    const nativeDevice = createNativeSlaveDeviceMock(0x48);
    const device = new NodeWebI2CSlaveDeviceAdapter(nativeDevice as never);

    await expect(device.read8(-1 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(device.write8(0x01, 0x100 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    await expect(device.write16(0x01, 0x10000 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativeDevice.read8).not.toHaveBeenCalled();
    expect(nativeDevice.write8).not.toHaveBeenCalled();
    expect(nativeDevice.write16).not.toHaveBeenCalled();
  });
});

describe('NodeWebI2CPortAdapter', () => {
  it('exposes port metadata and opens a slave device', async () => {
    const nativePort = createNativePortMock(1);
    const port = new NodeWebI2CPortAdapter(nativePort as never);

    expect(port.portNumber).toBe(1);
    expect(port.portName).toBe('I2C1');
    expect(port.pinName).toBe('');

    const device = await port.open(0x48);
    expect(nativePort.open).toHaveBeenCalledWith(0x48);
    expect(device.slaveAddress).toBe(0x48);
  });

  it('rejects invalid slave addresses before open', async () => {
    const nativePort = createNativePortMock(1);
    const port = new NodeWebI2CPortAdapter(nativePort as never);

    await expect(port.open(0x80 as never)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'InvalidAccess',
    });
    expect(nativePort.open).not.toHaveBeenCalled();
  });

  it('maps open failures through mapI2cError', async () => {
    const nativePort = createNativePortMock(1);
    nativePort.open.mockRejectedValueOnce(new OperationError('open failed'));
    const port = new NodeWebI2CPortAdapter(nativePort as never);

    await expect(port.open(0x48)).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'Operation',
      message: 'open failed',
    });
  });
});

describe('NodeWebI2CAccessAdapter', () => {
  it('exposes adapted ports', () => {
    const nativePort = createNativePortMock(1);
    const nativeAccess = {
      ports: new Map([[1, nativePort]]),
    };

    const access = new NodeWebI2CAccessAdapter(nativeAccess as never);
    expect(access.ports.size).toBe(1);
    expect(access.ports.get(1)?.portNumber).toBe(1);
    expect(access.ports.get(1)?.portName).toBe('I2C1');
  });
});

describe('requestNodeI2CAccess', () => {
  beforeEach(() => {
    requestI2CAccessMock.mockReset();
  });

  it('returns domain I2CAccess with port list', async () => {
    const nativePort = createNativePortMock(1);
    requestI2CAccessMock.mockResolvedValueOnce({
      ports: new Map([[1, nativePort]]),
    });

    const access = await requestNodeI2CAccess();
    expect(access.ports.size).toBe(1);
    expect([...access.ports.keys()]).toEqual([1]);
  });

  it('maps request failures to ChirimenError', async () => {
    requestI2CAccessMock.mockRejectedValueOnce(
      new OperationError('i2c unavailable')
    );

    await expect(requestNodeI2CAccess()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'Operation',
      message: 'i2c unavailable',
    });
  });
});

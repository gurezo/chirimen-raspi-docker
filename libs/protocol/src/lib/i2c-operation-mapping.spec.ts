import {
  I2C_OPERATION_RUNTIME_MAPPINGS,
  i2cOperationsFromLegacyFunctionId,
  legacyFunctionIdFromI2cOperation,
} from './i2c-operation-mapping.js';
import { LegacyFunctionId } from './legacy-function-ids.js';
import type { ProtocolRequest } from './messages.js';
import {
  isI2cPortSlaveRequestPayload,
  isI2cProtocolOperation,
  isI2cReadBytesRequestPayload,
  isI2cRegisterReadRequestPayload,
  isI2cWrite16RequestPayload,
  isI2cWrite8RequestPayload,
  isI2cWriteByteRequestPayload,
  isI2cWriteBytesRequestPayload,
  isProtocolI2cByte,
  isProtocolI2cBytesLength,
  isProtocolI2cPortNumber,
  isProtocolI2cRegisterNumber,
  isProtocolI2cSlaveAddress,
  isProtocolI2cWord,
  isProtocolOperation,
} from './operations.js';

describe('I2C protocol operations', () => {
  it('lists all I2C request operations', () => {
    expect(isI2cProtocolOperation('i2c.open')).toBe(true);
    expect(isI2cProtocolOperation('i2c.close')).toBe(true);
    expect(isI2cProtocolOperation('i2c.read8')).toBe(true);
    expect(isI2cProtocolOperation('i2c.read16')).toBe(true);
    expect(isI2cProtocolOperation('i2c.write8')).toBe(true);
    expect(isI2cProtocolOperation('i2c.write16')).toBe(true);
    expect(isI2cProtocolOperation('i2c.readByte')).toBe(true);
    expect(isI2cProtocolOperation('i2c.writeByte')).toBe(true);
    expect(isI2cProtocolOperation('i2c.readBytes')).toBe(true);
    expect(isI2cProtocolOperation('i2c.writeBytes')).toBe(true);
    expect(isI2cProtocolOperation('gpio.export')).toBe(false);
  });

  it('accepts I2C scalar guards', () => {
    expect(isProtocolI2cPortNumber(1)).toBe(true);
    expect(isProtocolI2cPortNumber(-1)).toBe(false);
    expect(isProtocolI2cPortNumber(1.5)).toBe(false);

    expect(isProtocolI2cSlaveAddress(0x48)).toBe(true);
    expect(isProtocolI2cSlaveAddress(0x80)).toBe(false);

    expect(isProtocolI2cRegisterNumber(0xffff)).toBe(true);
    expect(isProtocolI2cRegisterNumber(0x10000)).toBe(false);

    expect(isProtocolI2cByte(0xff)).toBe(true);
    expect(isProtocolI2cByte(0x100)).toBe(false);

    expect(isProtocolI2cWord(0xffff)).toBe(true);
    expect(isProtocolI2cWord(0x10000)).toBe(false);

    expect(isProtocolI2cBytesLength(1)).toBe(true);
    expect(isProtocolI2cBytesLength(127)).toBe(true);
    expect(isProtocolI2cBytesLength(0)).toBe(false);
    expect(isProtocolI2cBytesLength(128)).toBe(false);
  });

  it('validates I2C request payloads', () => {
    expect(
      isI2cPortSlaveRequestPayload({ portNumber: 1, slaveAddress: 0x48 })
    ).toBe(true);
    expect(isI2cPortSlaveRequestPayload({ portNumber: 1 })).toBe(false);

    expect(
      isI2cRegisterReadRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
      })
    ).toBe(true);
    expect(
      isI2cRegisterReadRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
      })
    ).toBe(false);

    expect(
      isI2cWrite8RequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
        value: 0xaa,
      })
    ).toBe(true);
    expect(
      isI2cWrite8RequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
        value: 0x100,
      })
    ).toBe(false);

    expect(
      isI2cWrite16RequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
        value: 0x1234,
      })
    ).toBe(true);
    expect(
      isI2cWrite16RequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
        value: 0x10000,
      })
    ).toBe(false);

    expect(
      isI2cWriteByteRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        value: 0x01,
      })
    ).toBe(true);
    expect(
      isI2cWriteByteRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        value: 0x100,
      })
    ).toBe(false);

    expect(
      isI2cReadBytesRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        length: 4,
      })
    ).toBe(true);
    expect(
      isI2cReadBytesRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        length: 0,
      })
    ).toBe(false);

    expect(
      isI2cWriteBytesRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        bytes: [0x01, 0x02],
      })
    ).toBe(true);
    expect(
      isI2cWriteBytesRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        bytes: [],
      })
    ).toBe(false);
    expect(
      isI2cWriteBytesRequestPayload({
        portNumber: 1,
        slaveAddress: 0x48,
        bytes: [0x100],
      })
    ).toBe(false);
  });

  it('narrows typed I2C request samples', () => {
    const openRequest: ProtocolRequest<'i2c.open'> = {
      kind: 'request',
      requestId: 1,
      operation: 'i2c.open',
      payload: { portNumber: 1, slaveAddress: 0x48 },
    };
    const write8Request: ProtocolRequest<'i2c.write8'> = {
      kind: 'request',
      requestId: 2,
      operation: 'i2c.write8',
      payload: {
        portNumber: 1,
        slaveAddress: 0x48,
        registerNumber: 0x10,
        value: 0xaa,
      },
    };
    const readBytesRequest: ProtocolRequest<'i2c.readBytes'> = {
      kind: 'request',
      requestId: 3,
      operation: 'i2c.readBytes',
      payload: { portNumber: 1, slaveAddress: 0x48, length: 4 },
    };
    const writeBytesRequest: ProtocolRequest<'i2c.writeBytes'> = {
      kind: 'request',
      requestId: 4,
      operation: 'i2c.writeBytes',
      payload: { portNumber: 1, slaveAddress: 0x48, bytes: [0x01, 0x02] },
    };

    expect(isProtocolOperation(openRequest.operation)).toBe(true);
    expect(isI2cPortSlaveRequestPayload(openRequest.payload)).toBe(true);
    expect(isI2cWrite8RequestPayload(write8Request.payload)).toBe(true);
    expect(isI2cReadBytesRequestPayload(readBytesRequest.payload)).toBe(true);
    expect(isI2cWriteBytesRequestPayload(writeBytesRequest.payload)).toBe(
      true
    );
  });
});

describe('I2C operation runtime mapping', () => {
  it('covers all I2C request operations', () => {
    const operations = I2C_OPERATION_RUNTIME_MAPPINGS.map(
      (entry) => entry.operation
    );
    expect(operations).toEqual([
      'i2c.open',
      'i2c.close',
      'i2c.write8',
      'i2c.write16',
      'i2c.writeByte',
      'i2c.writeBytes',
      'i2c.readByte',
      'i2c.readBytes',
      'i2c.read8',
      'i2c.read16',
    ]);
  });

  it('maps legacy I2C function ids to protocol operation groups', () => {
    expect(
      i2cOperationsFromLegacyFunctionId(LegacyFunctionId.I2cOpenClose)
    ).toEqual(['i2c.open', 'i2c.close']);
    expect(i2cOperationsFromLegacyFunctionId(LegacyFunctionId.I2cWrite)).toEqual(
      ['i2c.write8', 'i2c.write16', 'i2c.writeByte', 'i2c.writeBytes']
    );
    expect(i2cOperationsFromLegacyFunctionId(LegacyFunctionId.I2cRead)).toEqual([
      'i2c.readByte',
      'i2c.readBytes',
    ]);
    expect(
      i2cOperationsFromLegacyFunctionId(LegacyFunctionId.I2cRegisterRead)
    ).toEqual(['i2c.read8', 'i2c.read16']);
    expect(
      i2cOperationsFromLegacyFunctionId(LegacyFunctionId.GpioExport)
    ).toEqual([]);
  });

  it('maps protocol I2C operations back to legacy ids', () => {
    expect(legacyFunctionIdFromI2cOperation('i2c.open')).toBe(
      LegacyFunctionId.I2cOpenClose
    );
    expect(legacyFunctionIdFromI2cOperation('i2c.close')).toBe(
      LegacyFunctionId.I2cOpenClose
    );
    expect(legacyFunctionIdFromI2cOperation('i2c.write8')).toBe(
      LegacyFunctionId.I2cWrite
    );
    expect(legacyFunctionIdFromI2cOperation('i2c.readByte')).toBe(
      LegacyFunctionId.I2cRead
    );
    expect(legacyFunctionIdFromI2cOperation('i2c.read8')).toBe(
      LegacyFunctionId.I2cRegisterRead
    );
  });

  it('documents Node Runtime open/close for i2c.open/close', () => {
    const openMapping = I2C_OPERATION_RUNTIME_MAPPINGS.find(
      (entry) => entry.operation === 'i2c.open'
    );
    const closeMapping = I2C_OPERATION_RUNTIME_MAPPINGS.find(
      (entry) => entry.operation === 'i2c.close'
    );

    expect(openMapping?.nodeRuntime).toContain('I2cSession.open');
    expect(openMapping?.domainDevice).toBe('I2CPort.open(slaveAddress)');
    expect(closeMapping?.nodeRuntime).toContain('I2cSession.close');
    expect(closeMapping?.domainDevice).toBeNull();
  });

  it('marks all I2C mappings as browser requests', () => {
    expect(
      I2C_OPERATION_RUNTIME_MAPPINGS.every((entry) => entry.browserRequest)
    ).toBe(true);
  });
});

import { LegacyFunctionId } from './legacy-function-ids.js';
import type { I2cProtocolOperation } from './operations.js';

/**
 * I2C protocol operation と Node Runtime / Domain の対応記述。
 * `libs/protocol` は i2c / node-runtime に依存しないため、対応は文字列で固定する。
 *
 * @see docs/architecture/protocol.md
 */
export interface I2cOperationRuntimeMapping {
  readonly operation: I2cProtocolOperation;
  readonly legacyFunctionId: LegacyFunctionId;
  /** Node Runtime 側の対応（公開 API 名） */
  readonly nodeRuntime: string;
  /** Domain 側の対応。session 追跡のみの場合は null */
  readonly domainDevice: string | null;
  /**
   * Browser 起点の request として扱うか。
   * 現状の I2C protocol operation はすべて true。
   */
  readonly browserRequest: boolean;
}

/**
 * I2C protocol ↔ Node Runtime の 1:1 対応表。
 * `I2cSession.closeAll()` / `scan()` は Browser 起点 request 外のため含めない。
 * Scan は Demo-only（#114）。`i2c.scan` は追加しない。
 */
export const I2C_OPERATION_RUNTIME_MAPPINGS: readonly I2cOperationRuntimeMapping[] =
  [
    {
      operation: 'i2c.open',
      legacyFunctionId: LegacyFunctionId.I2cOpenClose,
      nodeRuntime: 'I2cSession.open(portNumber, slaveAddress)',
      domainDevice: 'I2CPort.open(slaveAddress)',
      browserRequest: true,
    },
    {
      operation: 'i2c.close',
      legacyFunctionId: LegacyFunctionId.I2cOpenClose,
      nodeRuntime: 'I2cSession.close(portNumber, slaveAddress)',
      domainDevice: null,
      browserRequest: true,
    },
    {
      operation: 'i2c.write8',
      legacyFunctionId: LegacyFunctionId.I2cWrite,
      nodeRuntime: 'I2CSlaveDevice.write8(...) (session-open device)',
      domainDevice: 'write8(registerNumber, value)',
      browserRequest: true,
    },
    {
      operation: 'i2c.write16',
      legacyFunctionId: LegacyFunctionId.I2cWrite,
      nodeRuntime: 'I2CSlaveDevice.write16(...) (session-open device)',
      domainDevice: 'write16(registerNumber, value)',
      browserRequest: true,
    },
    {
      operation: 'i2c.writeByte',
      legacyFunctionId: LegacyFunctionId.I2cWrite,
      nodeRuntime: 'I2CSlaveDevice.writeByte(...) (session-open device)',
      domainDevice: 'writeByte(byte)',
      browserRequest: true,
    },
    {
      operation: 'i2c.writeBytes',
      legacyFunctionId: LegacyFunctionId.I2cWrite,
      nodeRuntime: 'I2CSlaveDevice.writeBytes(...) (session-open device)',
      domainDevice: 'writeBytes(bytes)',
      browserRequest: true,
    },
    {
      operation: 'i2c.readByte',
      legacyFunctionId: LegacyFunctionId.I2cRead,
      nodeRuntime: 'I2CSlaveDevice.readByte() (session-open device)',
      domainDevice: 'readByte()',
      browserRequest: true,
    },
    {
      operation: 'i2c.readBytes',
      legacyFunctionId: LegacyFunctionId.I2cRead,
      nodeRuntime: 'I2CSlaveDevice.readBytes(length) (session-open device)',
      domainDevice: 'readBytes(length)',
      browserRequest: true,
    },
    {
      operation: 'i2c.read8',
      legacyFunctionId: LegacyFunctionId.I2cRegisterRead,
      nodeRuntime: 'I2CSlaveDevice.read8(...) (session-open device)',
      domainDevice: 'read8(registerNumber)',
      browserRequest: true,
    },
    {
      operation: 'i2c.read16',
      legacyFunctionId: LegacyFunctionId.I2cRegisterRead,
      nodeRuntime: 'I2CSlaveDevice.read16(...) (session-open device)',
      domainDevice: 'read16(registerNumber)',
      browserRequest: true,
    },
  ] as const;

const I2C_LEGACY_TO_OPERATIONS: ReadonlyMap<
  LegacyFunctionId,
  readonly I2cProtocolOperation[]
> = new Map([
  [LegacyFunctionId.I2cOpenClose, ['i2c.open', 'i2c.close']],
  [
    LegacyFunctionId.I2cWrite,
    ['i2c.write8', 'i2c.write16', 'i2c.writeByte', 'i2c.writeBytes'],
  ],
  [LegacyFunctionId.I2cRead, ['i2c.readByte', 'i2c.readBytes']],
  [LegacyFunctionId.I2cRegisterRead, ['i2c.read8', 'i2c.read16']],
]);

/** Legacy I2C function id から protocol operation 群へ変換する（1:N） */
export function i2cOperationsFromLegacyFunctionId(
  functionId: LegacyFunctionId
): readonly I2cProtocolOperation[] {
  return I2C_LEGACY_TO_OPERATIONS.get(functionId) ?? [];
}

/** protocol I2C operation から Legacy function id を返す */
export function legacyFunctionIdFromI2cOperation(
  operation: I2cProtocolOperation
): LegacyFunctionId {
  const mapping = I2C_OPERATION_RUNTIME_MAPPINGS.find(
    (entry) => entry.operation === operation
  );
  if (!mapping) {
    throw new Error(`Unknown I2C protocol operation: ${operation}`);
  }
  return mapping.legacyFunctionId;
}

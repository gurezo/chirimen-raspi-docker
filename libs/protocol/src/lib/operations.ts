/**
 * Protocol 上の操作名。
 * domain API（GPIO / I2C）と 1:1 に近い文字列。数値 function id への対応は legacy-function-ids を参照。
 */
export type ProtocolOperation =
  | 'gpio.export'
  | 'gpio.read'
  | 'gpio.write'
  | 'gpio.unexport'
  | 'gpio.subscribe'
  | 'gpio.unsubscribe'
  | 'i2c.open'
  | 'i2c.close'
  | 'i2c.read8'
  | 'i2c.read16'
  | 'i2c.write8'
  | 'i2c.write16'
  | 'i2c.readByte'
  | 'i2c.writeByte'
  | 'i2c.readBytes'
  | 'i2c.writeBytes';

/** Server → Browser の event operation */
export type ProtocolEventOperation = 'gpio.onchange';

/** GPIO direction（domain の 'in' | 'out' と一致。wire 上の 0/1 変換は #34） */
export type ProtocolGpioDirection = 'in' | 'out';

/** GPIO value（0 | 1） */
export type ProtocolGpioValue = 0 | 1;

/** operation ごとの request payload */
export interface ProtocolRequestPayloadMap {
  readonly 'gpio.export': {
    readonly portNumber: number;
    readonly direction: ProtocolGpioDirection;
  };
  readonly 'gpio.read': {
    readonly portNumber: number;
  };
  readonly 'gpio.write': {
    readonly portNumber: number;
    readonly value: ProtocolGpioValue;
  };
  readonly 'gpio.unexport': {
    readonly portNumber: number;
  };
  readonly 'gpio.subscribe': {
    readonly portNumber: number;
  };
  readonly 'gpio.unsubscribe': {
    readonly portNumber: number;
  };
  readonly 'i2c.open': {
    readonly portNumber: number;
    readonly slaveAddress: number;
  };
  readonly 'i2c.close': {
    readonly portNumber: number;
    readonly slaveAddress: number;
  };
  readonly 'i2c.read8': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly registerNumber: number;
  };
  readonly 'i2c.read16': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly registerNumber: number;
  };
  readonly 'i2c.write8': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly registerNumber: number;
    readonly value: number;
  };
  readonly 'i2c.write16': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly registerNumber: number;
    readonly value: number;
  };
  readonly 'i2c.readByte': {
    readonly portNumber: number;
    readonly slaveAddress: number;
  };
  readonly 'i2c.writeByte': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly value: number;
  };
  readonly 'i2c.readBytes': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly length: number;
  };
  readonly 'i2c.writeBytes': {
    readonly portNumber: number;
    readonly slaveAddress: number;
    readonly bytes: readonly number[];
  };
}

/** operation ごとの success response payload */
export interface ProtocolSuccessPayloadMap {
  readonly 'gpio.export': Record<string, never>;
  readonly 'gpio.read': {
    readonly value: ProtocolGpioValue;
  };
  readonly 'gpio.write': Record<string, never>;
  readonly 'gpio.unexport': Record<string, never>;
  readonly 'gpio.subscribe': Record<string, never>;
  readonly 'gpio.unsubscribe': Record<string, never>;
  readonly 'i2c.open': Record<string, never>;
  readonly 'i2c.close': Record<string, never>;
  readonly 'i2c.read8': {
    readonly value: number;
  };
  readonly 'i2c.read16': {
    readonly value: number;
  };
  readonly 'i2c.write8': Record<string, never>;
  readonly 'i2c.write16': Record<string, never>;
  readonly 'i2c.readByte': {
    readonly value: number;
  };
  readonly 'i2c.writeByte': Record<string, never>;
  readonly 'i2c.readBytes': {
    readonly bytes: readonly number[];
  };
  readonly 'i2c.writeBytes': {
    readonly bytes: readonly number[];
  };
}

/** event operation ごとの payload */
export interface ProtocolEventPayloadMap {
  readonly 'gpio.onchange': {
    readonly portNumber: number;
    readonly value: ProtocolGpioValue;
  };
}

export type ProtocolRequestPayload<Op extends ProtocolOperation> =
  ProtocolRequestPayloadMap[Op];

export type ProtocolSuccessPayload<Op extends ProtocolOperation> =
  ProtocolSuccessPayloadMap[Op];

export type ProtocolEventPayload<Op extends ProtocolEventOperation> =
  ProtocolEventPayloadMap[Op];

const PROTOCOL_OPERATIONS: readonly ProtocolOperation[] = [
  'gpio.export',
  'gpio.read',
  'gpio.write',
  'gpio.unexport',
  'gpio.subscribe',
  'gpio.unsubscribe',
  'i2c.open',
  'i2c.close',
  'i2c.read8',
  'i2c.read16',
  'i2c.write8',
  'i2c.write16',
  'i2c.readByte',
  'i2c.writeByte',
  'i2c.readBytes',
  'i2c.writeBytes',
] as const;

/** `value` が ProtocolOperation かどうか */
export function isProtocolOperation(
  value: unknown
): value is ProtocolOperation {
  return (
    typeof value === 'string' &&
    (PROTOCOL_OPERATIONS as readonly string[]).includes(value)
  );
}

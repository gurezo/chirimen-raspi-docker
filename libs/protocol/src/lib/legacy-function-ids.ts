/**
 * 旧 CHIRIMEN polyfill.js / srv.js の function id。
 * GPIO の runtime 対応は gpio-operation-mapping（#32）を参照。
 * I2C の runtime 対応は i2c-operation-mapping（#33）を参照。
 * JSON wire（#34）には載せない参照用定数。シリアライズは codec.ts が担う。
 *
 * @see docs/architecture/protocol.md
 */
export const LegacyFunctionId = {
  GpioExport: 0x10,
  GpioWrite: 0x11,
  GpioRead: 0x12,
  GpioUnexport: 0x13,
  GpioOnChange: 0x14,
  I2cOpenClose: 0x20,
  I2cWrite: 0x21,
  I2cRead: 0x22,
  I2cRegisterRead: 0x23,
} as const;

export type LegacyFunctionId =
  (typeof LegacyFunctionId)[keyof typeof LegacyFunctionId];

/** 旧メッセージ先頭バイト（kind） */
export const LegacyMessageKind = {
  ApiRequestResponse: 1,
  ChangeCallback: 2,
} as const;

export type LegacyMessageKind =
  (typeof LegacyMessageKind)[keyof typeof LegacyMessageKind];

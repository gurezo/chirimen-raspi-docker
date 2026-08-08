import type { I2CByte, I2CBytesLength, I2CWord } from './i2c-byte.js';
import type { I2CRegisterNumber } from './i2c-register-number.js';
import type { I2CSlaveAddress } from './i2c-slave-address.js';

/**
 * I2C スレーブデバイス操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface I2CSlaveDevice {
  readonly slaveAddress: I2CSlaveAddress;
  read8(registerNumber: I2CRegisterNumber): Promise<I2CByte>;
  read16(registerNumber: I2CRegisterNumber): Promise<I2CWord>;
  write8(registerNumber: I2CRegisterNumber, value: I2CByte): Promise<void>;
  write16(registerNumber: I2CRegisterNumber, value: I2CWord): Promise<void>;
  /** レジスタ無し raw 1 byte 読み取り（Web I2C 仕様外 / polyfill 互換） */
  readByte(): Promise<I2CByte>;
  /** レジスタ無し raw 1 byte 書き込み（Web I2C 仕様外 / polyfill 互換） */
  writeByte(byte: I2CByte): Promise<void>;
  /** レジスタ無し raw n byte 読み取り（Web I2C 仕様外 / polyfill 互換） */
  readBytes(length: I2CBytesLength): Promise<Uint8Array>;
  /** レジスタ無し raw n byte 書き込み（Web I2C 仕様外 / polyfill 互換） */
  writeBytes(bytes: readonly number[]): Promise<Uint8Array>;
}

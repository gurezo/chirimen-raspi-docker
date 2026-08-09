import type { I2CByte, I2CBytesLength, I2CWord } from './i2c-byte.js';
import type { I2CRegisterNumber } from './i2c-register-number.js';
import type { I2CSlaveAddress } from './i2c-slave-address.js';

/**
 * I2C スレーブデバイス操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 *
 * `readByte` / `writeByte` / `readBytes` / `writeBytes` は Web I2C 仕様外で、
 * CHIRIMEN polyfill 互換のために提供する。
 */
export interface I2CSlaveDevice {
  /** 開いているスレーブアドレス */
  readonly slaveAddress: I2CSlaveAddress;
  /**
   * レジスタから 8-bit 値を読む。
   * @param registerNumber - レジスタ番号
   */
  read8(registerNumber: I2CRegisterNumber): Promise<I2CByte>;
  /**
   * レジスタから 16-bit 値を読む。
   * @param registerNumber - レジスタ番号
   */
  read16(registerNumber: I2CRegisterNumber): Promise<I2CWord>;
  /**
   * レジスタへ 8-bit 値を書く。
   * @param registerNumber - レジスタ番号
   * @param value - 書き込む byte
   */
  write8(registerNumber: I2CRegisterNumber, value: I2CByte): Promise<void>;
  /**
   * レジスタへ 16-bit 値を書く。
   * @param registerNumber - レジスタ番号
   * @param value - 書き込む word
   */
  write16(registerNumber: I2CRegisterNumber, value: I2CWord): Promise<void>;
  /** レジスタ無し raw 1 byte 読み取り（Web I2C 仕様外 / polyfill 互換） */
  readByte(): Promise<I2CByte>;
  /**
   * レジスタ無し raw 1 byte 書き込み（Web I2C 仕様外 / polyfill 互換）。
   * @param byte - 書き込む byte
   */
  writeByte(byte: I2CByte): Promise<void>;
  /**
   * レジスタ無し raw n byte 読み取り（Web I2C 仕様外 / polyfill 互換）。
   * @param length - 読み取る長さ（1–127）
   */
  readBytes(length: I2CBytesLength): Promise<Uint8Array>;
  /**
   * レジスタ無し raw n byte 書き込み（Web I2C 仕様外 / polyfill 互換）。
   * @param bytes - 書き込むバイト列
   */
  writeBytes(bytes: readonly number[]): Promise<Uint8Array>;
}

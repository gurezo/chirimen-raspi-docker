import type { I2CByte, I2CWord } from './i2c-byte.js';
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
}

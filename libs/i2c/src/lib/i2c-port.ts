import type { I2CPortNumber } from './i2c-port-number.js';
import type { I2CSlaveAddress } from './i2c-slave-address.js';
import type { I2CSlaveDevice } from './i2c-slave-device.js';

/**
 * I2C ポート操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface I2CPort {
  readonly portNumber: I2CPortNumber;
  readonly portName: string;
  readonly pinName: string;
  open(slaveAddress: I2CSlaveAddress): Promise<I2CSlaveDevice>;
}

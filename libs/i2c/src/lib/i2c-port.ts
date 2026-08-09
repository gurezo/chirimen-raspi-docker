import type { I2CPortNumber } from './i2c-port-number.js';
import type { I2CSlaveAddress } from './i2c-slave-address.js';
import type { I2CSlaveDevice } from './i2c-slave-device.js';

/**
 * I2C ポート操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface I2CPort {
  /** ポート番号 */
  readonly portNumber: I2CPortNumber;
  /** ポート名（表示用） */
  readonly portName: string;
  /** ピン名（表示用） */
  readonly pinName: string;
  /**
   * 指定スレーブアドレスのデバイスを開く。
   * @param slaveAddress - 7-bit スレーブアドレス
   */
  open(slaveAddress: I2CSlaveAddress): Promise<I2CSlaveDevice>;
}

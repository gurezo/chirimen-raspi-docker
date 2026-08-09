import type { I2CPort } from './i2c-port.js';
import type { I2CPortNumber } from './i2c-port-number.js';

/** ポート番号から {@link I2CPort} を引くマップ */
export type I2CPortMap = ReadonlyMap<I2CPortNumber, I2CPort>;

/**
 * I2C アクセス操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface I2CAccess {
  /** 利用可能な I2C ポート一覧 */
  readonly ports: I2CPortMap;
}

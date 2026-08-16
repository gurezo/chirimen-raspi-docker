/**
 * I2C Scan example が使う I2C port（CHIRIMEN 互換の bus 1）。
 *
 * Runtime の `scanI2cPort` と同じ走査範囲。web-demo は node-runtime を import しない。
 */
export const I2C_SCAN_PORT = 1 as const;

/** I2C scan の開始アドレス（i2cdetect user space / chirimen-server 参照実装と一致） */
export const I2C_SCAN_ADDRESS_MIN = 0x03;

/** I2C scan の終了アドレス（inclusive） */
export const I2C_SCAN_ADDRESS_MAX = 0x77;

/**
 * slave address を 2 桁 hex 表記にする。
 *
 * @example
 * formatI2cSlaveAddress(0x48) // '0x48'
 */
export function formatI2cSlaveAddress(addr: number): string {
  return `0x${addr.toString(16).padStart(2, '0')}`;
}

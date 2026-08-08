import type { I2CPort, I2CSlaveAddress } from 'i2c';

/** I2C scan の開始アドレス（i2cdetect user space / chirimen-server 参照実装と一致） */
export const I2C_SCAN_ADDRESS_MIN = 0x03;

/** I2C scan の終了アドレス（inclusive） */
export const I2C_SCAN_ADDRESS_MAX = 0x77;

/**
 * 指定 I2C port 上で応答する slave address を走査する。
 * 各 address に対し open + writeByte(0x00) を試し、両方成功したものを返す。
 * address 単位の失敗は無視する（応答なし）。
 */
export async function scanI2cPort(port: I2CPort): Promise<I2CSlaveAddress[]> {
  const found: I2CSlaveAddress[] = [];

  for (let addr = I2C_SCAN_ADDRESS_MIN; addr <= I2C_SCAN_ADDRESS_MAX; addr++) {
    try {
      const device = await port.open(addr);
      await device.writeByte(0x00);
      found.push(addr);
    } catch {
      // 応答なし → 無視
    }
  }

  return found;
}

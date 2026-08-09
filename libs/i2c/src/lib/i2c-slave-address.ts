/** I2C 7-bit スレーブアドレス（0x00–0x7f） */
export type I2CSlaveAddress = number;

/**
 * `value` が有効な {@link I2CSlaveAddress} かどうか。
 * @param value - 判定対象
 */
export function isI2CSlaveAddress(value: unknown): value is I2CSlaveAddress {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0x00 &&
    value <= 0x7f
  );
}

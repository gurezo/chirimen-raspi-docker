/** I2C ポート番号（非負整数） */
export type I2CPortNumber = number;

/**
 * `value` が有効な {@link I2CPortNumber} かどうか。
 * @param value - 判定対象
 */
export function isI2CPortNumber(value: unknown): value is I2CPortNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

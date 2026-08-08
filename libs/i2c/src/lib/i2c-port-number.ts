/** I2C ポート番号 */
export type I2CPortNumber = number;

/** `value` が有効な I2C port number かどうか */
export function isI2CPortNumber(value: unknown): value is I2CPortNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

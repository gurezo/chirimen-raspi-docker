/** I2C レジスタ番号 */
export type I2CRegisterNumber = number;

/** `value` が有効な I2C register number かどうか */
export function isI2CRegisterNumber(
  value: unknown
): value is I2CRegisterNumber {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffff
  );
}

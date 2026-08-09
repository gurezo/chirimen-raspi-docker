/** I2C レジスタ番号（0–0xffff） */
export type I2CRegisterNumber = number;

/**
 * `value` が有効な {@link I2CRegisterNumber} かどうか。
 * @param value - 判定対象
 */
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

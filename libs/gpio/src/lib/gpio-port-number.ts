/** GPIO ポート番号（非負整数） */
export type GpioPortNumber = number;

/**
 * `value` が有効な {@link GpioPortNumber} かどうか。
 * @param value - 判定対象
 */
export function isGpioPortNumber(value: unknown): value is GpioPortNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

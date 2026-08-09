/** GPIO 値（0: LOW / 1: HIGH） */
export type GpioValue = 0 | 1;

/**
 * `value` が有効な {@link GpioValue} かどうか。
 * @param value - 判定対象
 */
export function isGpioValue(value: unknown): value is GpioValue {
  return value === 0 || value === 1;
}

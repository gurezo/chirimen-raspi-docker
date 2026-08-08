/** GPIO ポート番号 */
export type GpioPortNumber = number;

/** `value` が有効な GPIO port number かどうか */
export function isGpioPortNumber(value: unknown): value is GpioPortNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

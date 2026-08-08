/** GPIO 値 0: LOW / 1: HIGH */
export type GpioValue = 0 | 1;

/** `value` が有効な GPIO value かどうか */
export function isGpioValue(value: unknown): value is GpioValue {
  return value === 0 || value === 1;
}

/** GPIO 入出力方向 */
export type GpioDirection = 'in' | 'out';

const GPIO_DIRECTIONS: readonly GpioDirection[] = ['in', 'out'];

/** `value` が有効な GPIO direction かどうか */
export function isGpioDirection(value: unknown): value is GpioDirection {
  return (
    typeof value === 'string' &&
    (GPIO_DIRECTIONS as readonly string[]).includes(value)
  );
}

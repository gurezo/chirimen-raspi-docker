/** GPIO エッジ検出モード */
export type GpioEdge = 'none' | 'rising' | 'falling' | 'both';

const GPIO_EDGES: readonly GpioEdge[] = [
  'none',
  'rising',
  'falling',
  'both',
];

/**
 * `value` が有効な {@link GpioEdge} かどうか。
 * @param value - 判定対象
 */
export function isGpioEdge(value: unknown): value is GpioEdge {
  return (
    typeof value === 'string' && (GPIO_EDGES as readonly string[]).includes(value)
  );
}

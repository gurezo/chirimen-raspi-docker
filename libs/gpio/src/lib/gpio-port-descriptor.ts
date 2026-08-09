import type { GpioDirection } from './gpio-direction.js';
import type { GpioEdge } from './gpio-edge.js';
import type { GpioPortNumber } from './gpio-port-number.js';

/** GPIO ポートの記述情報（初期化・設定用） */
export interface GpioPortDescriptor {
  /** 対象ポート番号 */
  portNumber: GpioPortNumber;
  /** 入出力方向（省略可） */
  direction?: GpioDirection;
  /** エッジ検出モード（省略可） */
  edge?: GpioEdge;
}

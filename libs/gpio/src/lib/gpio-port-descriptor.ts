import type { GpioDirection } from './gpio-direction.js';
import type { GpioEdge } from './gpio-edge.js';
import type { GpioPortNumber } from './gpio-port-number.js';

/** GPIO ポートの記述情報 */
export interface GpioPortDescriptor {
  portNumber: GpioPortNumber;
  direction?: GpioDirection;
  edge?: GpioEdge;
}

/**
 * GPIO domain の公開 API。
 *
 * Web GPIO に近い型契約のみを提供する。
 * Node / Browser 固有の実装詳細は含めない。
 *
 * @packageDocumentation
 */
export type { GpioDirection } from './lib/gpio-direction.js';
export { isGpioDirection } from './lib/gpio-direction.js';
export type { GpioValue } from './lib/gpio-value.js';
export { isGpioValue } from './lib/gpio-value.js';
export type { GpioEdge } from './lib/gpio-edge.js';
export { isGpioEdge } from './lib/gpio-edge.js';
export type { GpioPortNumber } from './lib/gpio-port-number.js';
export { isGpioPortNumber } from './lib/gpio-port-number.js';
export type { GpioPortDescriptor } from './lib/gpio-port-descriptor.js';
export type { GpioPort } from './lib/gpio-port.js';
export type {
  GpioAccess,
  GpioChangeEvent,
  GpioChangeEventHandler,
  GpioPortMap,
} from './lib/gpio-access.js';

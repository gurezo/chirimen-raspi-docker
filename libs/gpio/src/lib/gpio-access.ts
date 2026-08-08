import type { GpioPort } from './gpio-port.js';
import type { GpioPortNumber } from './gpio-port-number.js';
import type { GpioValue } from './gpio-value.js';

/** GPIO 値変化イベント */
export interface GpioChangeEvent {
  readonly value: GpioValue;
  readonly portNumber: GpioPortNumber;
}

/** GPIO 値変化イベントハンドラ */
export type GpioChangeEventHandler = (event: GpioChangeEvent) => void;

/** ポート番号から GpioPort を引くマップ */
export type GpioPortMap = ReadonlyMap<GpioPortNumber, GpioPort>;

/**
 * GPIO アクセス操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface GpioAccess {
  readonly ports: GpioPortMap;
  unexportAll(): Promise<void>;
}

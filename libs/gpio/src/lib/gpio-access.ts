import type { GpioPort } from './gpio-port.js';
import type { GpioPortNumber } from './gpio-port-number.js';
import type { GpioValue } from './gpio-value.js';

/** GPIO 値変化イベント */
export interface GpioChangeEvent {
  /** 変化後の値（0: LOW / 1: HIGH） */
  readonly value: GpioValue;
  /** 変化したポート番号 */
  readonly portNumber: GpioPortNumber;
}

/** GPIO 値変化イベントハンドラ */
export type GpioChangeEventHandler = (event: GpioChangeEvent) => void;

/** ポート番号から {@link GpioPort} を引くマップ */
export type GpioPortMap = ReadonlyMap<GpioPortNumber, GpioPort>;

/**
 * GPIO アクセス操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface GpioAccess {
  /** 利用可能な GPIO ポート一覧 */
  readonly ports: GpioPortMap;
  /** export 済みポートをすべて解放する */
  unexportAll(): Promise<void>;
}

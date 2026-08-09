import type { GpioChangeEventHandler } from './gpio-access.js';
import type { GpioDirection } from './gpio-direction.js';
import type { GpioPortNumber } from './gpio-port-number.js';
import type { GpioValue } from './gpio-value.js';

/**
 * GPIO ポート操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface GpioPort {
  /** ポート番号 */
  readonly portNumber: GpioPortNumber;
  /** ポート名（表示用） */
  readonly portName: string;
  /** ピン名（表示用） */
  readonly pinName: string;
  /** export 済みかどうか */
  readonly exported: boolean;
  /** 現在の入出力方向 */
  readonly direction: GpioDirection;
  /** 値変化ハンドラ。未設定時は null */
  onchange: GpioChangeEventHandler | null;
  /**
   * ポートを指定方向で export する。
   * @param direction - 入出力方向
   */
  export(direction: GpioDirection): Promise<void>;
  /** ポートを unexport する */
  unexport(): Promise<void>;
  /** 現在の値を読み取る */
  read(): Promise<GpioValue>;
  /**
   * 値を書き込む（`direction` が `out` のとき）。
   * @param value - 書き込む値（0: LOW / 1: HIGH）
   */
  write(value: GpioValue): Promise<void>;
}

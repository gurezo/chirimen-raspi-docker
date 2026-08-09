import type { GpioChangeEventHandler } from './gpio-access.js';
import type { GpioDirection } from './gpio-direction.js';
import type { GpioPortNumber } from './gpio-port-number.js';
import type { GpioValue } from './gpio-value.js';

/**
 * GPIO ポート操作契約。
 * Node / Browser 固有の実装詳細は含めない。
 */
export interface GpioPort {
  readonly portNumber: GpioPortNumber;
  readonly portName: string;
  readonly pinName: string;
  readonly exported: boolean;
  readonly direction: GpioDirection;
  /** 値変化ハンドラ。未設定時は null */
  onchange: GpioChangeEventHandler | null;
  export(direction: GpioDirection): Promise<void>;
  unexport(): Promise<void>;
  read(): Promise<GpioValue>;
  write(value: GpioValue): Promise<void>;
}

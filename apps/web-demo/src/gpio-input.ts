import { ChirimenError } from 'core';
import type { GpioAccess, GpioPort, GpioValue } from 'gpio';

/**
 * GPIO Input example が使う GPIO port（BCM 番号）。
 *
 * 回路仕様の正本は `docs/examples/gpio-input.md`。
 * 40-pin header では物理 pin 29。
 * 旧 CHIRIMEN `gc/gpio/button` のタクトスイッチと同じ `ports.get(5)`。
 */
export const GPIO_INPUT_PORT = 5 as const;

/** GPIO 値が変わったときの listener */
export type GpioInputValueListener = (value: GpioValue) => void;

/**
 * Browser Polyfill の `navigator.requestGPIOAccess` で GPIO input を読む session。
 *
 * Start: requestGPIOAccess → ports.get → export('in') → read() → onchange
 * Read: read()
 * Stop: onchange = null → unexport
 *
 * `onchange` 設定で `gpio.subscribe`、解除で `gpio.unsubscribe`。
 */
export class GpioInputSession {
  #port: GpioPort | null = null;
  #value: GpioValue = 0;
  #running = false;
  #startPromise: Promise<void> | null = null;
  readonly #onValue: GpioInputValueListener | undefined;

  constructor(options: { readonly onValue?: GpioInputValueListener } = {}) {
    this.#onValue = options.onValue;
  }

  get running(): boolean {
    return this.#running;
  }

  get starting(): boolean {
    return this.#startPromise !== null;
  }

  get value(): GpioValue {
    return this.#value;
  }

  /**
   * GPIO5 を input で開き、現在値を読む。
   * 実行中、または開始処理中なら no-op。
   */
  async start(): Promise<void> {
    if (this.#running || this.#startPromise !== null) {
      return;
    }

    const startPromise = this.#doStart();
    this.#startPromise = startPromise;
    try {
      await startPromise;
    } finally {
      if (this.#startPromise === startPromise) {
        this.#startPromise = null;
      }
    }
  }

  /**
   * 実行中なら GPIO を再読込する。未開始なら no-op。
   */
  async readValue(): Promise<void> {
    const port = this.#port;
    if (!this.#running || port === null) {
      return;
    }

    const value = await port.read();
    if (this.#running && this.#port === port) {
      this.#setValue(value);
    }
  }

  /**
   * GPIO を unexport する。
   * 未開始なら no-op。開始処理中なら完了を待ってから止める。
   */
  async stop(): Promise<void> {
    const startPromise = this.#startPromise;
    if (startPromise !== null) {
      try {
        await startPromise;
      } catch {
        // start 失敗時は解放済み。続く release は no-op
      }
    }

    if (!this.#running && this.#port === null) {
      return;
    }

    this.#running = false;
    await this.#releasePort();
  }

  async #doStart(): Promise<void> {
    const access = await requestGpioAccess();
    const port = access.ports.get(GPIO_INPUT_PORT);
    if (port === undefined) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${GPIO_INPUT_PORT} is not available`
      );
    }

    await port.export('in');
    this.#port = port;

    try {
      const value = await port.read();
      this.#setValue(value);
      port.onchange = (event) => {
        if (this.#port === port) {
          this.#setValue(event.value);
        }
      };
    } catch (error) {
      await this.#releasePort();
      throw error;
    }

    this.#running = true;
  }

  #setValue(value: GpioValue): void {
    this.#value = value;
    this.#onValue?.(value);
  }

  async #releasePort(): Promise<void> {
    const port = this.#port;
    this.#port = null;
    this.#setValue(0);
    if (port === null) {
      return;
    }

    port.onchange = null;

    try {
      await port.unexport();
    } catch {
      // session は idle に戻す
    }
  }
}

async function requestGpioAccess(): Promise<GpioAccess> {
  const navigatorRef = globalThis.navigator as
    | (Navigator & { requestGPIOAccess?: () => Promise<GpioAccess> })
    | undefined;
  const request = navigatorRef?.requestGPIOAccess;
  if (typeof request !== 'function') {
    throw new ChirimenError(
      'InvalidAccess',
      'navigator.requestGPIOAccess is not available'
    );
  }
  return request.call(navigatorRef);
}

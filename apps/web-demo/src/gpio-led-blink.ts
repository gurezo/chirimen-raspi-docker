import { ChirimenError } from 'core';
import type { GpioAccess, GpioPort, GpioValue } from 'gpio';

/**
 * LED Blink example が使う GPIO port（BCM 番号）。
 *
 * 回路仕様の正本は `docs/examples/gpio-led-blink.md`。
 * 40-pin header では物理 pin 37。
 */
export const LED_BLINK_GPIO_PORT = 26 as const;

/** hello-real-world と同じ点滅間隔（ms） */
export const LED_BLINK_INTERVAL_MS = 1000 as const;

/** GPIO 値が変わったときの listener */
export type LedBlinkValueListener = (value: GpioValue) => void;

/**
 * Browser Polyfill の `navigator.requestGPIOAccess` で LED を点滅させる session。
 *
 * Start: requestGPIOAccess → ports.get → export('out') → write(1/0)
 * Stop: interval 解除 → write(0) → unexport
 */
export class LedBlinkSession {
  #port: GpioPort | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #value: GpioValue = 0;
  #running = false;
  #startPromise: Promise<void> | null = null;
  #tickInFlight = false;
  readonly #onValue: LedBlinkValueListener | undefined;

  constructor(options: { readonly onValue?: LedBlinkValueListener } = {}) {
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
   * GPIO26 を output で開き、点滅を開始する。
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
   * 点滅を止め、GPIO を unexport する。
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

    this.#clearTimer();
    this.#running = false;
    await this.#releasePort();
  }

  async #doStart(): Promise<void> {
    const access = await requestGpioAccess();
    const port = access.ports.get(LED_BLINK_GPIO_PORT);
    if (port === undefined) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${LED_BLINK_GPIO_PORT} is not available`
      );
    }

    await port.export('out');
    this.#port = port;

    try {
      await this.#writeValue(1);
    } catch (error) {
      await this.#releasePort();
      throw error;
    }

    this.#running = true;
    this.#timer = setInterval(() => {
      void this.#tick();
    }, LED_BLINK_INTERVAL_MS);
  }

  async #tick(): Promise<void> {
    const port = this.#port;
    if (!this.#running || port === null || this.#tickInFlight) {
      return;
    }

    this.#tickInFlight = true;
    const next: GpioValue = this.#value === 1 ? 0 : 1;
    try {
      await port.write(next);
      if (this.#running && this.#port === port) {
        this.#setValue(next);
      }
    } catch {
      // interval 中の write 失敗は次 tick に任せる
    } finally {
      this.#tickInFlight = false;
    }
  }

  async #writeValue(value: GpioValue): Promise<void> {
    const port = this.#port;
    if (port === null) {
      return;
    }
    await port.write(value);
    this.#setValue(value);
  }

  #setValue(value: GpioValue): void {
    this.#value = value;
    this.#onValue?.(value);
  }

  #clearTimer(): void {
    if (this.#timer === null) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = null;
  }

  async #releasePort(): Promise<void> {
    const port = this.#port;
    this.#port = null;
    this.#setValue(0);
    if (port === null) {
      return;
    }

    try {
      await port.write(0);
    } catch {
      // Stop 時は write 失敗でも unexport を続ける
    }

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

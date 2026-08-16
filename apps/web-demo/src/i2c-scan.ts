import { ChirimenError } from 'core';
import type { I2CAccess } from 'i2c';

/**
 * I2C Scan example が使う I2C port（CHIRIMEN 互換の bus 1）。
 *
 * Runtime の `scanI2cPort` と同じ走査範囲。web-demo は node-runtime を import しない。
 */
export const I2C_SCAN_PORT = 1 as const;

/** I2C scan の開始アドレス（i2cdetect user space / chirimen-server 参照実装と一致） */
export const I2C_SCAN_ADDRESS_MIN = 0x03;

/** I2C scan の終了アドレス（inclusive） */
export const I2C_SCAN_ADDRESS_MAX = 0x77;

/**
 * slave address を 2 桁 hex 表記にする。
 *
 * @example
 * formatI2cSlaveAddress(0x48) // '0x48'
 */
export function formatI2cSlaveAddress(addr: number): string {
  return `0x${addr.toString(16).padStart(2, '0')}`;
}

/** 検出 address が変わったときの listener */
export type I2cScanAddressesListener = (addresses: readonly number[]) => void;

/** Scan probe に使う raw byte（Runtime `scanI2cPort` と同じ） */
const I2C_SCAN_PROBE_BYTE = 0x00;

/**
 * Browser Polyfill の `navigator.requestI2CAccess` で I2C bus を走査する session。
 *
 * Scan: requestI2CAccess → ports.get(1) → 0x03–0x77 で open + writeByte(0x00)
 * Stop: 走査ループを中断する。Browser から個別 close はしない。
 */
export class I2cScanSession {
  #scanning = false;
  #scanPromise: Promise<void> | null = null;
  #scanId = 0;
  #addresses: number[] = [];
  #completed = false;
  readonly #onAddresses: I2cScanAddressesListener | undefined;

  constructor(
    options: { readonly onAddresses?: I2cScanAddressesListener } = {}
  ) {
    this.#onAddresses = options.onAddresses;
  }

  get scanning(): boolean {
    return this.#scanning;
  }

  get addresses(): readonly number[] {
    return this.#addresses;
  }

  /** 直近の scan が中断されずに完了したか */
  get completed(): boolean {
    return this.#completed;
  }

  /**
   * I2C bus 1 を走査する。実行中なら no-op。
   */
  async scan(): Promise<void> {
    if (this.#scanning || this.#scanPromise !== null) {
      return;
    }

    const scanId = ++this.#scanId;
    this.#completed = false;
    this.#setAddresses([]);
    const scanPromise = this.#doScan(scanId);
    this.#scanning = true;
    this.#scanPromise = scanPromise;
    try {
      await scanPromise;
      if (scanId === this.#scanId) {
        this.#completed = true;
      }
    } finally {
      if (this.#scanPromise === scanPromise) {
        this.#scanPromise = null;
        this.#scanning = false;
      }
    }
  }

  /**
   * 走査を中断する。未開始なら no-op。実行中なら完了を待って結果を捨てる。
   */
  async stop(): Promise<void> {
    this.#scanId += 1;
    const scanPromise = this.#scanPromise;
    if (scanPromise !== null) {
      try {
        await scanPromise;
      } catch {
        // 中断時の失敗は UI に出さない
      }
    }

    this.#scanning = false;
    this.#completed = false;
    this.#setAddresses([]);
  }

  async #doScan(scanId: number): Promise<void> {
    const access = await requestI2cAccess();
    if (scanId !== this.#scanId) {
      return;
    }

    const port = access.ports.get(I2C_SCAN_PORT);
    if (port === undefined) {
      throw new ChirimenError(
        'InvalidAccess',
        `I2C port ${I2C_SCAN_PORT} is not available`
      );
    }

    const found: number[] = [];
    for (
      let addr = I2C_SCAN_ADDRESS_MIN;
      addr <= I2C_SCAN_ADDRESS_MAX;
      addr++
    ) {
      if (scanId !== this.#scanId) {
        return;
      }

      try {
        const device = await port.open(addr);
        await device.writeByte(I2C_SCAN_PROBE_BYTE);
        if (scanId !== this.#scanId) {
          return;
        }
        found.push(addr);
        this.#setAddresses(found);
      } catch {
        // 応答なし → 無視
      }
    }

    if (scanId === this.#scanId) {
      this.#setAddresses(found);
    }
  }

  #setAddresses(addresses: readonly number[]): void {
    this.#addresses = [...addresses];
    this.#onAddresses?.(this.#addresses);
  }
}

async function requestI2cAccess(): Promise<I2CAccess> {
  const navigatorRef = globalThis.navigator as
    | (Navigator & { requestI2CAccess?: () => Promise<I2CAccess> })
    | undefined;
  const request = navigatorRef?.requestI2CAccess;
  if (typeof request !== 'function') {
    throw new ChirimenError(
      'InvalidAccess',
      'navigator.requestI2CAccess is not available'
    );
  }
  return request.call(navigatorRef);
}

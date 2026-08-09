import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioPortNumber,
  type GpioAccess,
  type GpioChangeEvent,
  type GpioChangeEventHandler,
  type GpioPort,
  type GpioPortNumber,
} from 'gpio';
import { mapGpioError } from './map-gpio-error.js';

/**
 * 同一 session 内で open 済み GPIO port を追跡し、
 * open / release / releaseAll / subscribe / unsubscribe で lifecycle を管理する。
 */
export class GpioSession {
  readonly #access: GpioAccess;
  readonly #opened = new Map<GpioPortNumber, GpioPort>();
  readonly #subscribers = new Map<
    GpioPortNumber,
    Set<GpioChangeEventHandler>
  >();

  constructor(access: GpioAccess) {
    this.#access = access;
  }

  /** 指定 port がこの session で open 済みかどうか */
  isOpen(portNumber: GpioPortNumber): boolean {
    return this.#opened.has(portNumber);
  }

  /**
   * この session で open 済みの port を返す。
   * 未 open の場合は InvalidAccess。
   */
  getOpenedPort(portNumber: unknown): GpioPort {
    if (!isGpioPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(portNumber)}`
      );
    }

    const port = this.#opened.get(portNumber);
    if (!port) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${portNumber} is not open in this session`
      );
    }

    return port;
  }

  /**
   * 指定 GPIO port を input / output として open（export）する。
   * 同一 session で既に open 済みの port は direction に関わらず拒否する。
   */
  async open(portNumber: unknown, direction: unknown): Promise<GpioPort> {
    if (!isGpioPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(portNumber)}`
      );
    }

    if (!isGpioDirection(direction)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO direction: ${String(direction)}`
      );
    }

    if (this.#opened.has(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${portNumber} is already open in this session`
      );
    }

    const port = this.#access.ports.get(portNumber);
    if (!port) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${portNumber} is not available`
      );
    }

    try {
      await port.export(direction);
    } catch (error) {
      throw mapGpioError(error);
    }

    this.#opened.set(portNumber, port);
    return port;
  }

  /**
   * 指定 GPIO port の値変化を購読する。
   * 最初の subscriber 登録時に watch を開始する。
   */
  async subscribe(
    portNumber: unknown,
    listener: GpioChangeEventHandler
  ): Promise<void> {
    if (!isGpioPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(portNumber)}`
      );
    }

    if (typeof listener !== 'function') {
      throw new ChirimenError(
        'InvalidAccess',
        'GPIO change listener must be a function'
      );
    }

    const port = this.#opened.get(portNumber);
    if (!port) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${portNumber} is not open in this session`
      );
    }

    if (port.direction !== 'in') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${portNumber} direction is '${port.direction}', expected 'in' for subscribe`
      );
    }

    let listeners = this.#subscribers.get(portNumber);
    if (!listeners) {
      listeners = new Set();
      this.#subscribers.set(portNumber, listeners);
      port.onchange = (event: GpioChangeEvent) => {
        for (const handler of this.#subscribers.get(portNumber) ?? []) {
          handler(event);
        }
      };
    }

    listeners.add(listener);
  }

  /**
   * 指定 GPIO port の購読を解除する。
   * listener 省略時は当該 port の全 subscriber を解除する。
   * 最後の subscriber 解除時に watch を停止する。
   */
  async unsubscribe(
    portNumber: unknown,
    listener?: GpioChangeEventHandler
  ): Promise<void> {
    if (!isGpioPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(portNumber)}`
      );
    }

    const listeners = this.#subscribers.get(portNumber);
    if (!listeners) {
      return;
    }

    if (listener) {
      listeners.delete(listener);
    } else {
      listeners.clear();
    }

    if (listeners.size === 0) {
      this.#stopWatch(portNumber);
    }
  }

  /**
   * 指定 GPIO port を release（unexport）する。
   * 未 open / 既 release の場合は idempotent に no-op とする。
   * watch / subscription がある場合は先に解除する。
   */
  async release(portNumber: unknown): Promise<void> {
    if (!isGpioPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(portNumber)}`
      );
    }

    const port = this.#opened.get(portNumber);
    if (!port) {
      return;
    }

    this.#stopWatch(portNumber);

    try {
      await port.unexport();
    } catch (error) {
      throw mapGpioError(error);
    }

    this.#opened.delete(portNumber);
  }

  /**
   * session 内の open 済み GPIO をすべて解放する。
   * client disconnect 時の cleanup 用 API。
   */
  async releaseAll(): Promise<void> {
    const opened = [...this.#opened.entries()];
    for (const [portNumber, port] of opened) {
      this.#stopWatch(portNumber);
      try {
        await port.unexport();
      } catch (error) {
        throw mapGpioError(error);
      } finally {
        this.#opened.delete(portNumber);
      }
    }
  }

  #stopWatch(portNumber: GpioPortNumber): void {
    this.#subscribers.delete(portNumber);
    const port = this.#opened.get(portNumber);
    if (port) {
      port.onchange = null;
    }
  }
}

/** GpioAccess から session を生成する */
export function createGpioSession(access: GpioAccess): GpioSession {
  return new GpioSession(access);
}

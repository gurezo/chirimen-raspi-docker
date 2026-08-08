import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioPortNumber,
  type GpioAccess,
  type GpioPort,
  type GpioPortNumber,
} from 'gpio';
import { mapGpioError } from './map-gpio-error.js';

/**
 * 同一 session 内で open 済み GPIO port を追跡し、
 * open / release / releaseAll で lifecycle を管理する。
 */
export class GpioSession {
  readonly #access: GpioAccess;
  readonly #opened = new Map<GpioPortNumber, GpioPort>();

  constructor(access: GpioAccess) {
    this.#access = access;
  }

  /** 指定 port がこの session で open 済みかどうか */
  isOpen(portNumber: GpioPortNumber): boolean {
    return this.#opened.has(portNumber);
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
   * 指定 GPIO port を release（unexport）する。
   * 未 open / 既 release の場合は idempotent に no-op とする。
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
      try {
        await port.unexport();
      } catch (error) {
        throw mapGpioError(error);
      } finally {
        this.#opened.delete(portNumber);
      }
    }
  }
}

/** GpioAccess から session を生成する */
export function createGpioSession(access: GpioAccess): GpioSession {
  return new GpioSession(access);
}

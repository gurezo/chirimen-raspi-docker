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
 * 同一 session 内で open 済み GPIO port を追跡し、重複 open を拒否する。
 * release / cleanup は後続 Issue で扱う。
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
}

/** GpioAccess から session を生成する */
export function createGpioSession(access: GpioAccess): GpioSession {
  return new GpioSession(access);
}

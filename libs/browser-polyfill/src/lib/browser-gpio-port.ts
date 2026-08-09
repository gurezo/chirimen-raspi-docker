import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioValue,
  type GpioChangeEventHandler,
  type GpioDirection,
  type GpioPort,
  type GpioPortNumber,
  type GpioValue,
} from 'gpio';

import type { WebSocketClientTransport } from './websocket-client-transport.js';

/**
 * protocol transport 経由で GpioPort 契約を満たす Browser 実装。
 * onchange / subscribe 配線は Phase 5 #41。
 */
export class BrowserGpioPort implements GpioPort {
  readonly portNumber: GpioPortNumber;
  readonly portName: string;
  readonly pinName: string;
  onchange: GpioChangeEventHandler | null = null;

  #exported = false;
  #direction: GpioDirection = 'in';
  readonly #transport: WebSocketClientTransport;

  constructor(
    portNumber: GpioPortNumber,
    transport: WebSocketClientTransport
  ) {
    this.portNumber = portNumber;
    this.portName = `GPIO${portNumber}`;
    this.pinName = `PIN${portNumber}`;
    this.#transport = transport;
  }

  get exported(): boolean {
    return this.#exported;
  }

  get direction(): GpioDirection {
    return this.#direction;
  }

  async export(direction: GpioDirection): Promise<void> {
    if (!isGpioDirection(direction)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO direction: ${String(direction)}`
      );
    }

    await this.#transport.request('gpio.export', {
      portNumber: this.portNumber,
      direction,
    });
    this.#direction = direction;
    this.#exported = true;
  }

  async unexport(): Promise<void> {
    await this.#transport.request('gpio.unexport', {
      portNumber: this.portNumber,
    });
    this.#exported = false;
  }

  async read(): Promise<GpioValue> {
    if (!this.#exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.#direction !== 'in') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.#direction}', expected 'in' for read`
      );
    }

    const response = await this.#transport.request('gpio.read', {
      portNumber: this.portNumber,
    });
    const value = response.payload.value;
    if (!isGpioValue(value)) {
      throw new ChirimenError(
        'Operation',
        `Invalid GPIO value read: ${String(value)}`
      );
    }
    return value;
  }

  async write(value: GpioValue): Promise<void> {
    if (!isGpioValue(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO value: ${String(value)}`
      );
    }

    if (!this.#exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.#direction !== 'out') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.#direction}', expected 'out' for write`
      );
    }

    await this.#transport.request('gpio.write', {
      portNumber: this.portNumber,
      value,
    });
  }
}

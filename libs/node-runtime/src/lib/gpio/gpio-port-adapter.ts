import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioPortNumber,
  isGpioValue,
  type GpioChangeEventHandler,
  type GpioDirection,
  type GpioPort,
  type GpioPortNumber,
  type GpioValue,
} from 'gpio';
import type { GPIOPort as NativeGpioPort } from 'node-web-gpio';
import { mapGpioError } from './map-gpio-error.js';

type NativeChangeEvent = {
  readonly value: unknown;
  readonly port: NativeGpioPort;
};

/**
 * node-web-gpio の GPIOPort を domain GpioPort へ委譲する adapter。
 */
export class NodeWebGpioPortAdapter implements GpioPort {
  #onchange: GpioChangeEventHandler | null = null;
  #nativeChangeListener: ((event: NativeChangeEvent) => void) | null = null;

  constructor(private readonly nativePort: NativeGpioPort) {}

  get portNumber(): GpioPortNumber {
    const value = this.nativePort.portNumber;
    if (!isGpioPortNumber(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO port number: ${String(value)}`
      );
    }
    return value;
  }

  get portName(): string {
    return this.nativePort.portName;
  }

  get pinName(): string {
    return this.nativePort.pinName;
  }

  get exported(): boolean {
    return this.nativePort.exported;
  }

  get direction(): GpioDirection {
    const value = this.nativePort.direction;
    if (!isGpioDirection(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO direction: ${String(value)}`
      );
    }
    return value;
  }

  get onchange(): GpioChangeEventHandler | null {
    return this.#onchange;
  }

  set onchange(handler: GpioChangeEventHandler | null) {
    this.#detachNativeListener();
    this.#onchange = handler;
    if (handler) {
      this.#attachNativeListener();
    }
  }

  async export(direction: GpioDirection): Promise<void> {
    if (!isGpioDirection(direction)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO direction: ${String(direction)}`
      );
    }

    try {
      await this.nativePort.export(direction);
    } catch (error) {
      throw mapGpioError(error);
    }
  }

  async unexport(): Promise<void> {
    this.onchange = null;

    try {
      await this.nativePort.unexport();
    } catch (error) {
      throw mapGpioError(error);
    }
  }

  async read(): Promise<GpioValue> {
    if (!this.exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.direction !== 'in') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.direction}', expected 'in' for read`
      );
    }

    try {
      const value = await this.nativePort.read();
      if (!isGpioValue(value)) {
        throw new ChirimenError(
          'Operation',
          `Invalid GPIO value read: ${String(value)}`
        );
      }
      return value;
    } catch (error) {
      throw mapGpioError(error);
    }
  }

  async write(value: GpioValue): Promise<void> {
    if (!isGpioValue(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO value: ${String(value)}`
      );
    }

    if (!this.exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.direction !== 'out') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.direction}', expected 'out' for write`
      );
    }

    try {
      await this.nativePort.write(value);
    } catch (error) {
      throw mapGpioError(error);
    }
  }

  #attachNativeListener(): void {
    const listener = (event: NativeChangeEvent): void => {
      if (!this.#onchange) {
        return;
      }
      if (!isGpioValue(event.value)) {
        return;
      }
      this.#onchange({
        value: event.value,
        portNumber: this.portNumber,
      });
    };
    this.#nativeChangeListener = listener;
    this.nativePort.on('change', listener);
  }

  #detachNativeListener(): void {
    if (!this.#nativeChangeListener) {
      return;
    }
    this.nativePort.off('change', this.#nativeChangeListener);
    this.#nativeChangeListener = null;
  }
}

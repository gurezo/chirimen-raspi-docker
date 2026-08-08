import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioPortNumber,
  isGpioValue,
  type GpioDirection,
  type GpioPort,
  type GpioPortNumber,
  type GpioValue,
} from 'gpio';
import type { GPIOPort as NativeGpioPort } from 'node-web-gpio';
import { mapGpioError } from './map-gpio-error.js';

/**
 * node-web-gpio の GPIOPort を domain GpioPort へ委譲する adapter。
 */
export class NodeWebGpioPortAdapter implements GpioPort {
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
    try {
      await this.nativePort.unexport();
    } catch (error) {
      throw mapGpioError(error);
    }
  }

  async read(): Promise<GpioValue> {
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
    try {
      await this.nativePort.write(value);
    } catch (error) {
      throw mapGpioError(error);
    }
  }
}

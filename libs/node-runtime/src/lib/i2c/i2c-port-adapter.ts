import { ChirimenError } from 'core';
import {
  isI2CPortNumber,
  isI2CSlaveAddress,
  type I2CPort,
  type I2CPortNumber,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
} from 'i2c';
import type { I2CPort as NativeI2CPort } from 'node-web-i2c';
import { NodeWebI2CSlaveDeviceAdapter } from './i2c-slave-device-adapter.js';
import { mapI2cError } from './map-i2c-error.js';

/**
 * node-web-i2c の I2CPort を domain I2CPort へ委譲する adapter。
 */
export class NodeWebI2CPortAdapter implements I2CPort {
  constructor(private readonly nativePort: NativeI2CPort) {}

  get portNumber(): I2CPortNumber {
    const value = this.nativePort.portNumber;
    if (!isI2CPortNumber(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C port number: ${String(value)}`
      );
    }
    return value;
  }

  get portName(): string {
    return this.nativePort.portName;
  }

  /**
   * node-web-i2c の I2CPort には pinName が無いため空文字を返す。
   */
  get pinName(): string {
    return '';
  }

  async open(slaveAddress: I2CSlaveAddress): Promise<I2CSlaveDevice> {
    if (!isI2CSlaveAddress(slaveAddress)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C slave address: ${String(slaveAddress)}`
      );
    }

    try {
      const nativeDevice = await this.nativePort.open(slaveAddress);
      return new NodeWebI2CSlaveDeviceAdapter(nativeDevice);
    } catch (error) {
      throw mapI2cError(error);
    }
  }
}

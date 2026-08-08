import { ChirimenError } from 'core';
import {
  isI2CByte,
  isI2CRegisterNumber,
  isI2CSlaveAddress,
  isI2CWord,
  type I2CByte,
  type I2CRegisterNumber,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
  type I2CWord,
} from 'i2c';
import type { I2CSlaveDevice as NativeI2CSlaveDevice } from 'node-web-i2c';
import { mapI2cError } from './map-i2c-error.js';

/**
 * node-web-i2c の I2CSlaveDevice を domain I2CSlaveDevice へ委譲する adapter。
 */
export class NodeWebI2CSlaveDeviceAdapter implements I2CSlaveDevice {
  constructor(private readonly nativeDevice: NativeI2CSlaveDevice) {}

  get slaveAddress(): I2CSlaveAddress {
    const value = this.nativeDevice.slaveAddress;
    if (!isI2CSlaveAddress(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C slave address: ${String(value)}`
      );
    }
    return value;
  }

  async read8(registerNumber: I2CRegisterNumber): Promise<I2CByte> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    try {
      const value = await this.nativeDevice.read8(registerNumber);
      if (!isI2CByte(value)) {
        throw new ChirimenError(
          'Operation',
          `Invalid I2C byte read: ${String(value)}`
        );
      }
      return value;
    } catch (error) {
      throw mapI2cError(error);
    }
  }

  async read16(registerNumber: I2CRegisterNumber): Promise<I2CWord> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    try {
      const value = await this.nativeDevice.read16(registerNumber);
      if (!isI2CWord(value)) {
        throw new ChirimenError(
          'Operation',
          `Invalid I2C word read: ${String(value)}`
        );
      }
      return value;
    } catch (error) {
      throw mapI2cError(error);
    }
  }

  async write8(
    registerNumber: I2CRegisterNumber,
    value: I2CByte
  ): Promise<void> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    if (!isI2CByte(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C byte: ${String(value)}`
      );
    }

    try {
      await this.nativeDevice.write8(registerNumber, value);
    } catch (error) {
      throw mapI2cError(error);
    }
  }

  async write16(
    registerNumber: I2CRegisterNumber,
    value: I2CWord
  ): Promise<void> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    if (!isI2CWord(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C word: ${String(value)}`
      );
    }

    try {
      await this.nativeDevice.write16(registerNumber, value);
    } catch (error) {
      throw mapI2cError(error);
    }
  }
}

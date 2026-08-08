import { ChirimenError } from 'core';
import {
  isI2CPortNumber,
  isI2CSlaveAddress,
  type I2CAccess,
  type I2CPortNumber,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
} from 'i2c';
import { mapI2cError } from './map-i2c-error.js';

type OpenedDeviceKey = `${I2CPortNumber}:${I2CSlaveAddress}`;

function toOpenedDeviceKey(
  portNumber: I2CPortNumber,
  slaveAddress: I2CSlaveAddress
): OpenedDeviceKey {
  return `${portNumber}:${slaveAddress}`;
}

/**
 * 同一 session 内で open 済み I2C slave device を追跡し、
 * open / close / closeAll で lifecycle を管理する。
 */
export class I2cSession {
  readonly #access: I2CAccess;
  readonly #opened = new Map<OpenedDeviceKey, I2CSlaveDevice>();

  constructor(access: I2CAccess) {
    this.#access = access;
  }

  /** 指定 port / slave address がこの session で open 済みかどうか */
  isOpen(portNumber: I2CPortNumber, slaveAddress: I2CSlaveAddress): boolean {
    return this.#opened.has(toOpenedDeviceKey(portNumber, slaveAddress));
  }

  /**
   * 指定 I2C port 上の slave device を open する。
   * 同一 session で既に open 済みの (port, address) は拒否する。
   */
  async open(
    portNumber: unknown,
    slaveAddress: unknown
  ): Promise<I2CSlaveDevice> {
    if (!isI2CPortNumber(portNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C port number: ${String(portNumber)}`
      );
    }

    if (!isI2CSlaveAddress(slaveAddress)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C slave address: ${String(slaveAddress)}`
      );
    }

    const key = toOpenedDeviceKey(portNumber, slaveAddress);
    if (this.#opened.has(key)) {
      throw new ChirimenError(
        'InvalidAccess',
        `I2C device ${slaveAddress} on port ${portNumber} is already open in this session`
      );
    }

    const port = this.#access.ports.get(portNumber);
    if (!port) {
      throw new ChirimenError(
        'InvalidAccess',
        `I2C port ${portNumber} is not available`
      );
    }

    let device: I2CSlaveDevice;
    try {
      device = await port.open(slaveAddress);
    } catch (error) {
      throw mapI2cError(error);
    }

    this.#opened.set(key, device);
    return device;
  }
}

/** I2CAccess から session を生成する */
export function createI2cSession(access: I2CAccess): I2cSession {
  return new I2cSession(access);
}

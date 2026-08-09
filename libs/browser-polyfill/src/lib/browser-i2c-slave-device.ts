import { ChirimenError } from 'core';
import {
  isI2CByte,
  isI2CBytesLength,
  isI2CRegisterNumber,
  isI2CWord,
  type I2CByte,
  type I2CBytesLength,
  type I2CPortNumber,
  type I2CRegisterNumber,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
  type I2CWord,
} from 'i2c';

import type { WebSocketClientTransport } from './websocket-client-transport.js';

/**
 * protocol transport 経由で {@link I2CSlaveDevice} 契約を満たす Browser 実装。
 */
export class BrowserI2CSlaveDevice implements I2CSlaveDevice {
  readonly slaveAddress: I2CSlaveAddress;
  readonly #portNumber: I2CPortNumber;
  readonly #transport: WebSocketClientTransport;

  constructor(
    portNumber: I2CPortNumber,
    slaveAddress: I2CSlaveAddress,
    transport: WebSocketClientTransport
  ) {
    this.#portNumber = portNumber;
    this.slaveAddress = slaveAddress;
    this.#transport = transport;
  }

  async read8(registerNumber: I2CRegisterNumber): Promise<I2CByte> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    const response = await this.#transport.request('i2c.read8', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      registerNumber,
    });
    const value = response.payload.value;
    if (!isI2CByte(value)) {
      throw new ChirimenError(
        'Operation',
        `Invalid I2C byte read: ${String(value)}`
      );
    }
    return value;
  }

  async read16(registerNumber: I2CRegisterNumber): Promise<I2CWord> {
    if (!isI2CRegisterNumber(registerNumber)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C register number: ${String(registerNumber)}`
      );
    }

    const response = await this.#transport.request('i2c.read16', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      registerNumber,
    });
    const value = response.payload.value;
    if (!isI2CWord(value)) {
      throw new ChirimenError(
        'Operation',
        `Invalid I2C word read: ${String(value)}`
      );
    }
    return value;
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

    await this.#transport.request('i2c.write8', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      registerNumber,
      value,
    });
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

    await this.#transport.request('i2c.write16', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      registerNumber,
      value,
    });
  }

  async readByte(): Promise<I2CByte> {
    const response = await this.#transport.request('i2c.readByte', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
    });
    const value = response.payload.value;
    if (!isI2CByte(value)) {
      throw new ChirimenError(
        'Operation',
        `Invalid I2C byte read: ${String(value)}`
      );
    }
    return value;
  }

  async writeByte(byte: I2CByte): Promise<void> {
    if (!isI2CByte(byte)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C byte: ${String(byte)}`
      );
    }

    await this.#transport.request('i2c.writeByte', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      value: byte,
    });
  }

  async readBytes(length: I2CBytesLength): Promise<Uint8Array> {
    if (!isI2CBytesLength(length)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C bytes length: ${String(length)}`
      );
    }

    const response = await this.#transport.request('i2c.readBytes', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      length,
    });
    return toUint8Array(response.payload.bytes, 'Invalid I2C bytes read');
  }

  async writeBytes(bytes: readonly number[]): Promise<Uint8Array> {
    if (!Array.isArray(bytes)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C bytes: ${String(bytes)}`
      );
    }

    for (const byte of bytes) {
      if (!isI2CByte(byte)) {
        throw new ChirimenError(
          'InvalidAccess',
          `Invalid I2C byte: ${String(byte)}`
        );
      }
    }

    const response = await this.#transport.request('i2c.writeBytes', {
      portNumber: this.#portNumber,
      slaveAddress: this.slaveAddress,
      bytes,
    });
    return toUint8Array(
      response.payload.bytes,
      'Invalid I2C bytes write result'
    );
  }
}

function toUint8Array(bytes: readonly number[], errorLabel: string): Uint8Array {
  if (!Array.isArray(bytes)) {
    throw new ChirimenError('Operation', `${errorLabel}: ${String(bytes)}`);
  }
  for (const byte of bytes) {
    if (!isI2CByte(byte)) {
      throw new ChirimenError('Operation', `${errorLabel}: ${String(byte)}`);
    }
  }
  return Uint8Array.from(bytes);
}

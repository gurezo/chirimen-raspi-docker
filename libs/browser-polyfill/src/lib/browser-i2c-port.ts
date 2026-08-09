import { ChirimenError } from 'core';
import {
  isI2CSlaveAddress,
  type I2CPort,
  type I2CPortNumber,
  type I2CSlaveAddress,
  type I2CSlaveDevice,
} from 'i2c';

import { BrowserI2CSlaveDevice } from './browser-i2c-slave-device.js';
import type { WebSocketClientTransport } from './websocket-client-transport.js';

/**
 * protocol transport 経由で I2CPort 契約を満たす Browser 実装。
 */
export class BrowserI2CPort implements I2CPort {
  readonly portNumber: I2CPortNumber;
  readonly portName: string;
  readonly pinName: string;
  readonly #transport: WebSocketClientTransport;

  constructor(
    portNumber: I2CPortNumber,
    transport: WebSocketClientTransport
  ) {
    this.portNumber = portNumber;
    this.portName = `I2C${portNumber}`;
    this.pinName = `PIN${portNumber}`;
    this.#transport = transport;
  }

  async open(slaveAddress: I2CSlaveAddress): Promise<I2CSlaveDevice> {
    if (!isI2CSlaveAddress(slaveAddress)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid I2C slave address: ${String(slaveAddress)}`
      );
    }

    await this.#transport.request('i2c.open', {
      portNumber: this.portNumber,
      slaveAddress,
    });

    return new BrowserI2CSlaveDevice(
      this.portNumber,
      slaveAddress,
      this.#transport
    );
  }
}

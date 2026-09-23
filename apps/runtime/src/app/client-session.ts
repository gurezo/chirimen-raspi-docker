import type { GpioSession, I2cSession } from 'node-runtime';
import type { SessionId } from 'protocol';

export interface ClientSessionOptions {
  readonly sessionId: SessionId;
  readonly gpio: GpioSession;
  readonly i2c: I2cSession;
}

/**
 * Browser client 1 接続分の runtime session。
 * 旧 srv.js の connection（uid + exportedPorts / usingSlaveAddrs）相当。
 */
export class ClientSession {
  readonly sessionId: SessionId;
  readonly gpio: GpioSession;
  readonly i2c: I2cSession;

  constructor(options: ClientSessionOptions) {
    this.sessionId = options.sessionId;
    this.gpio = options.gpio;
    this.i2c = options.i2c;
  }

  /**
   * 接続切断時に GPIO / I2C リソースを解放する。
   * 片方の失敗でももう片方の cleanup は継続する。
   */
  async cleanup(): Promise<void> {
    try {
      await this.gpio.releaseAll();
    } catch (error: unknown) {
      console.error(
        `[ session ${this.sessionId} ] GPIO cleanup failed`,
        error
      );
    }

    try {
      await this.i2c.closeAll();
    } catch (error: unknown) {
      console.error(
        `[ session ${this.sessionId} ] I2C cleanup failed`,
        error
      );
    }
  }
}

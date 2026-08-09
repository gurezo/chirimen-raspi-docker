import type { I2CAccess, I2CPort, I2CPortMap, I2CPortNumber } from 'i2c';

import { BrowserI2CPort } from './browser-i2c-port.js';
import { CHIRIMEN_I2C_PORTS } from './i2c-ports.js';
import type { WebSocketClientTransport } from './websocket-client-transport.js';

/**
 * protocol transport 経由で {@link I2CAccess} 契約を満たす Browser 実装。
 * `ports` は CHIRIMEN 互換の固定 I2C バス一覧。
 *
 * @param transport - 共有 WebSocket transport
 */
export class BrowserI2CAccess implements I2CAccess {
  /** CHIRIMEN 互換 I2C ポート一覧 */
  readonly ports: I2CPortMap;

  constructor(transport: WebSocketClientTransport) {
    const map = new Map<I2CPortNumber, I2CPort>();
    for (const portNumber of CHIRIMEN_I2C_PORTS) {
      map.set(portNumber, new BrowserI2CPort(portNumber, transport));
    }
    this.ports = map;
  }
}

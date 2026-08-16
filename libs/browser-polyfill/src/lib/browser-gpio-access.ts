import type { GpioAccess, GpioPort, GpioPortMap, GpioPortNumber } from 'gpio';

import { BrowserGpioPort } from './browser-gpio-port.js';
import { CHIRIMEN_GPIO_PORTS } from './gpio-ports.js';
import type { WebSocketClientTransport } from './websocket/client/transport.js';

/**
 * protocol transport 経由で {@link GpioAccess} 契約を満たす Browser 実装。
 * `ports` は CHIRIMEN 互換の固定 BCM ピン一覧。
 *
 * @param transport - 共有 WebSocket transport
 */
export class BrowserGpioAccess implements GpioAccess {
  /** CHIRIMEN 互換 GPIO ポート一覧 */
  readonly ports: GpioPortMap;

  constructor(transport: WebSocketClientTransport) {
    const map = new Map<GpioPortNumber, GpioPort>();
    for (const portNumber of CHIRIMEN_GPIO_PORTS) {
      map.set(portNumber, new BrowserGpioPort(portNumber, transport));
    }
    this.ports = map;
  }

  async unexportAll(): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (const port of this.ports.values()) {
      if (port.exported) {
        tasks.push(port.unexport());
      }
    }
    await Promise.all(tasks);
  }
}

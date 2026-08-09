import { ChirimenError } from 'core';
import {
  isGpioDirection,
  isGpioValue,
  type GpioChangeEventHandler,
  type GpioDirection,
  type GpioPort,
  type GpioPortNumber,
  type GpioValue,
} from 'gpio';

import type {
  ProtocolEventListener,
  ReconnectListener,
  WebSocketClientTransport,
} from './websocket-client-transport.js';

/**
 * protocol transport 経由で {@link GpioPort} 契約を満たす Browser 実装。
 * `onchange` 設定時に `gpio.subscribe`、解除時に `gpio.unsubscribe` を送る。
 * reconnect 成功後は export / subscribe をサーバ側 session に復元する。
 */
export class BrowserGpioPort implements GpioPort {
  readonly portNumber: GpioPortNumber;
  readonly portName: string;
  readonly pinName: string;

  #exported = false;
  #direction: GpioDirection = 'in';
  #onchange: GpioChangeEventHandler | null = null;
  #eventListener: ProtocolEventListener | null = null;
  #subscribed = false;
  #subscribePending = false;
  #subscriptionEpoch = 0;
  readonly #transport: WebSocketClientTransport;
  readonly #reconnectListener: ReconnectListener;

  constructor(
    portNumber: GpioPortNumber,
    transport: WebSocketClientTransport
  ) {
    this.portNumber = portNumber;
    this.portName = `GPIO${portNumber}`;
    this.pinName = `PIN${portNumber}`;
    this.#transport = transport;
    this.#reconnectListener = () => {
      void this.#restoreAfterReconnect();
    };
    this.#transport.addReconnectListener(this.#reconnectListener);
  }

  get exported(): boolean {
    return this.#exported;
  }

  get direction(): GpioDirection {
    return this.#direction;
  }

  get onchange(): GpioChangeEventHandler | null {
    return this.#onchange;
  }

  set onchange(handler: GpioChangeEventHandler | null) {
    this.#detachSubscription();

    if (handler === null) {
      this.#onchange = null;
      return;
    }

    if (!this.#exported) {
      this.#onchange = null;
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    this.#onchange = handler;
    this.#attachSubscription();
  }

  async export(direction: GpioDirection): Promise<void> {
    if (!isGpioDirection(direction)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO direction: ${String(direction)}`
      );
    }

    await this.#transport.request('gpio.export', {
      portNumber: this.portNumber,
      direction,
    });
    this.#direction = direction;
    this.#exported = true;
  }

  async unexport(): Promise<void> {
    this.onchange = null;
    await this.#transport.request('gpio.unexport', {
      portNumber: this.portNumber,
    });
    this.#exported = false;
  }

  async read(): Promise<GpioValue> {
    if (!this.#exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.#direction !== 'in') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.#direction}', expected 'in' for read`
      );
    }

    const response = await this.#transport.request('gpio.read', {
      portNumber: this.portNumber,
    });
    const value = response.payload.value;
    if (!isGpioValue(value)) {
      throw new ChirimenError(
        'Operation',
        `Invalid GPIO value read: ${String(value)}`
      );
    }
    return value;
  }

  async write(value: GpioValue): Promise<void> {
    if (!isGpioValue(value)) {
      throw new ChirimenError(
        'InvalidAccess',
        `Invalid GPIO value: ${String(value)}`
      );
    }

    if (!this.#exported) {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} is not exported`
      );
    }

    if (this.#direction !== 'out') {
      throw new ChirimenError(
        'InvalidAccess',
        `GPIO port ${this.portNumber} direction is '${this.#direction}', expected 'out' for write`
      );
    }

    await this.#transport.request('gpio.write', {
      portNumber: this.portNumber,
      value,
    });
  }

  /**
   * reconnect 後にサーバ側 session へ export / subscribe を復元する。
   * ローカルの handler / exported / direction は切断後も維持する。
   */
  async #restoreAfterReconnect(): Promise<void> {
    if (!this.#exported) {
      return;
    }

    try {
      await this.#transport.request('gpio.export', {
        portNumber: this.portNumber,
        direction: this.#direction,
      });
    } catch {
      return;
    }

    if (this.#onchange === null) {
      return;
    }

    // サーバ session は既に空のため unsubscribe は不要。
    // ローカル handler は残し、wire 上の subscribe だけ張り直す。
    this.#resetSubscriptionWireState();
    this.#attachSubscription();
  }

  #resetSubscriptionWireState(): void {
    if (this.#eventListener !== null) {
      this.#transport.removeEventListener(this.#eventListener);
      this.#eventListener = null;
    }
    this.#subscriptionEpoch += 1;
    this.#subscribed = false;
    this.#subscribePending = false;
  }

  #attachSubscription(): void {
    const listener: ProtocolEventListener = (event) => {
      if (event.operation !== 'gpio.onchange') {
        return;
      }
      if (event.payload.portNumber !== this.portNumber) {
        return;
      }
      if (!isGpioValue(event.payload.value)) {
        return;
      }
      const handler = this.#onchange;
      if (handler === null) {
        return;
      }
      handler({
        portNumber: this.portNumber,
        value: event.payload.value,
      });
    };

    this.#eventListener = listener;
    this.#transport.addEventListener(listener);
    this.#subscribePending = true;
    const epoch = this.#subscriptionEpoch;

    void this.#transport
      .request('gpio.subscribe', { portNumber: this.portNumber })
      .then(() => {
        if (epoch !== this.#subscriptionEpoch) {
          void this.#transport
            .request('gpio.unsubscribe', { portNumber: this.portNumber })
            .catch(() => undefined);
          return;
        }
        this.#subscribePending = false;
        this.#subscribed = true;
      })
      .catch(() => {
        if (epoch === this.#subscriptionEpoch) {
          this.#subscribePending = false;
        }
      });
  }

  #detachSubscription(): void {
    if (this.#eventListener !== null) {
      this.#transport.removeEventListener(this.#eventListener);
      this.#eventListener = null;
    }

    const shouldUnsubscribe = this.#subscribed || this.#subscribePending;
    this.#subscriptionEpoch += 1;
    this.#subscribed = false;
    this.#subscribePending = false;

    if (!shouldUnsubscribe) {
      return;
    }

    void this.#transport
      .request('gpio.unsubscribe', { portNumber: this.portNumber })
      .catch(() => undefined);
  }
}

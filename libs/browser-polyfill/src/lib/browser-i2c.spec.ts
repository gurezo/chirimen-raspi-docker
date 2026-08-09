import { ChirimenError } from 'core';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  isProtocolRequest,
  type ProtocolResponse,
} from 'protocol';

import {
  installBrowserPolyfill,
  requestI2CAccess,
  resetBrowserPolyfillForTests,
} from './navigator-gpio.js';
import type { WebSocketConstructor } from './websocket-client-transport.js';

let autoOpen = true;
let onSend: ((data: string, socket: FakeWebSocket) => void) | null = null;
const sentOperations: string[] = [];

/** Node（CI）でも動くよう DOM Event グローバルに依存しない */
type FakeOpenEvent = { readonly type: 'open' };
type FakeCloseEvent = { readonly type: 'close' };
type FakeErrorEvent = { readonly type: 'error' };
type FakeMessageEvent = { readonly type: 'message'; readonly data: string };

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: FakeOpenEvent) => void) | null = null;
  onclose: ((event: FakeCloseEvent) => void) | null = null;
  onerror: ((event: FakeErrorEvent) => void) | null = null;
  onmessage: ((event: FakeMessageEvent) => void) | null = null;

  constructor(public readonly url: string) {
    queueMicrotask(() => {
      if (!autoOpen) {
        return;
      }
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.({ type: 'open' });
    });
  }

  send(data: string): void {
    onSend?.(data, this);
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ type: 'close' });
  }

  emitMessage(data: string): void {
    this.onmessage?.({ type: 'message', data });
  }
}

function replyWithSuccess(
  data: string,
  socket: FakeWebSocket,
  payload: Record<string, unknown> = {}
): void {
  const request = decodeProtocolMessage(data);
  if (!isProtocolRequest(request)) {
    throw new Error('expected protocol request');
  }
  sentOperations.push(request.operation);
  const response: ProtocolResponse = {
    kind: 'response',
    requestId: request.requestId,
    ok: true,
    operation: request.operation,
    payload: payload as never,
  };
  socket.emitMessage(encodeProtocolMessage(response));
}

describe('navigator.requestI2CAccess', () => {
  beforeEach(() => {
    autoOpen = true;
    onSend = null;
    sentOperations.length = 0;
    resetBrowserPolyfillForTests();
  });

  afterEach(() => {
    resetBrowserPolyfillForTests();
  });

  it('rejects when polyfill is not installed', async () => {
    await expect(requestI2CAccess()).rejects.toMatchObject({
      code: 'InvalidAccess',
    });
  });

  it('resolves after install and exposes port 1', async () => {
    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestI2CAccess();
    const port = access.ports.get(1);

    expect(port).toBeDefined();
    expect(port?.portNumber).toBe(1);
    expect(port?.portName).toBe('I2C1');
    expect(port?.pinName).toBe('PIN1');
  });

  it('routes open/read/write through i2c protocol operations', async () => {
    onSend = (data, socket) => {
      const request = decodeProtocolMessage(data);
      if (!isProtocolRequest(request)) {
        throw new Error('expected protocol request');
      }
      switch (request.operation) {
        case 'i2c.read8':
        case 'i2c.readByte':
          replyWithSuccess(data, socket, { value: 0x42 });
          return;
        case 'i2c.read16':
          replyWithSuccess(data, socket, { value: 0x1234 });
          return;
        case 'i2c.readBytes':
        case 'i2c.writeBytes':
          replyWithSuccess(data, socket, { bytes: [0x01, 0x02] });
          return;
        default:
          replyWithSuccess(data, socket);
      }
    };

    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestI2CAccess();
    const port = access.ports.get(1);
    expect(port).toBeDefined();
    if (!port) {
      throw new Error('expected port 1');
    }

    const device = await port.open(0x48);
    expect(device.slaveAddress).toBe(0x48);

    expect(await device.read8(0x00)).toBe(0x42);
    expect(await device.read16(0x01)).toBe(0x1234);
    await device.write8(0x02, 0x10);
    await device.write16(0x03, 0xabcd);
    expect(await device.readByte()).toBe(0x42);
    await device.writeByte(0x55);
    await expect(device.readBytes(2)).resolves.toEqual(
      Uint8Array.from([0x01, 0x02])
    );
    await expect(device.writeBytes([0x01, 0x02])).resolves.toEqual(
      Uint8Array.from([0x01, 0x02])
    );

    expect(sentOperations).toEqual([
      'i2c.open',
      'i2c.read8',
      'i2c.read16',
      'i2c.write8',
      'i2c.write16',
      'i2c.readByte',
      'i2c.writeByte',
      'i2c.readBytes',
      'i2c.writeBytes',
    ]);
  });

  it('rejects invalid slave address on open', async () => {
    onSend = (data, socket) => {
      replyWithSuccess(data, socket);
    };

    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestI2CAccess();
    const port = access.ports.get(1);
    expect(port).toBeDefined();
    if (!port) {
      throw new Error('expected port 1');
    }

    await expect(port.open(0x80 as never)).rejects.toBeInstanceOf(ChirimenError);
    await expect(port.open(0x80 as never)).rejects.toMatchObject({
      code: 'InvalidAccess',
    });
    expect(sentOperations).toEqual([]);
  });
});

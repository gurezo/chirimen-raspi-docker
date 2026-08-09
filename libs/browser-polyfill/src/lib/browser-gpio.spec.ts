import { ChirimenError } from 'core';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  isProtocolRequest,
  type ProtocolResponse,
} from 'protocol';

import {
  installBrowserPolyfill,
  requestGPIOAccess,
  resetBrowserPolyfillForTests,
} from './navigator-polyfill.js';
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

describe('navigator.requestGPIOAccess', () => {
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
    await expect(requestGPIOAccess()).rejects.toMatchObject({
      code: 'InvalidAccess',
    });
  });

  it('resolves after install and exposes port 26', async () => {
    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestGPIOAccess();
    const port = access.ports.get(26);

    expect(port).toBeDefined();
    expect(port?.portNumber).toBe(26);
    expect(port?.portName).toBe('GPIO26');
    expect(port?.pinName).toBe('PIN26');
    expect(port?.exported).toBe(false);
  });

  it('routes export/read/write/unexport through gpio protocol operations', async () => {
    onSend = (data, socket) => {
      const request = decodeProtocolMessage(data);
      if (!isProtocolRequest(request)) {
        throw new Error('expected protocol request');
      }
      if (request.operation === 'gpio.read') {
        replyWithSuccess(data, socket, { value: 1 });
        return;
      }
      replyWithSuccess(data, socket);
    };

    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestGPIOAccess();
    const port = access.ports.get(26);
    expect(port).toBeDefined();
    if (!port) {
      throw new Error('expected port 26');
    }

    await port.export('out');
    expect(port.exported).toBe(true);
    expect(port.direction).toBe('out');

    await port.write(1);

    await port.export('in');
    expect(await port.read()).toBe(1);

    await port.unexport();
    expect(port.exported).toBe(false);

    expect(sentOperations).toEqual([
      'gpio.export',
      'gpio.write',
      'gpio.export',
      'gpio.read',
      'gpio.unexport',
    ]);
  });

  it('unexportAll releases exported ports', async () => {
    onSend = (data, socket) => {
      replyWithSuccess(data, socket);
    };

    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestGPIOAccess();
    const port26 = access.ports.get(26);
    const port17 = access.ports.get(17);
    expect(port26).toBeDefined();
    expect(port17).toBeDefined();
    if (!port26 || !port17) {
      throw new Error('expected ports 26 and 17');
    }

    await port26.export('out');
    await port17.export('in');
    await access.unexportAll();

    expect(port26.exported).toBe(false);
    expect(port17.exported).toBe(false);
    expect(sentOperations.filter((op) => op === 'gpio.unexport')).toHaveLength(
      2
    );
  });

  it('rejects read/write when port is not exported', async () => {
    await installBrowserPolyfill({
      url: 'ws://localhost:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestGPIOAccess();
    const port = access.ports.get(26);
    expect(port).toBeDefined();
    if (!port) {
      throw new Error('expected port 26');
    }

    await expect(port.read()).rejects.toBeInstanceOf(ChirimenError);
    await expect(port.write(1)).rejects.toMatchObject({
      code: 'InvalidAccess',
    });
  });
});

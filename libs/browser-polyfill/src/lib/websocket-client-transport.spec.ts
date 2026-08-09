import { ChirimenError } from 'core';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  isProtocolRequest,
  type ProtocolEvent,
  type ProtocolResponse,
} from 'protocol';

import {
  WebSocketClientTransport,
  type WebSocketConstructor,
} from './websocket-client-transport.js';

let autoOpen = true;
let onSend: ((data: string, socket: FakeWebSocket) => void) | null = null;

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

function createTransport(
  options: {
    timeoutMs?: number;
    onEvent?: (event: ProtocolEvent) => void;
  } = {}
): WebSocketClientTransport {
  return new WebSocketClientTransport({
    url: 'ws://localhost:33330/',
    webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    ...options,
  });
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
  const response: ProtocolResponse = {
    kind: 'response',
    requestId: request.requestId,
    ok: true,
    operation: request.operation,
    payload: payload as never,
  };
  socket.emitMessage(encodeProtocolMessage(response));
}

describe('WebSocketClientTransport', () => {
  beforeEach(() => {
    autoOpen = true;
    onSend = null;
  });

  it('correlates concurrent responses to the correct promises', async () => {
    const responses = new Map<number, number>();

    onSend = (data, socket) => {
      const request = decodeProtocolMessage(data);
      if (!isProtocolRequest(request)) {
        throw new Error('expected protocol request');
      }
      // 後から送った request を先に返す（順序逆転）
      queueMicrotask(() => {
        const value = request.payload as { portNumber: number };
        responses.set(request.requestId, value.portNumber);
        const response: ProtocolResponse = {
          kind: 'response',
          requestId: request.requestId,
          ok: true,
          operation: 'gpio.read',
          payload: { value: value.portNumber === 26 ? 1 : 0 },
        };
        socket.emitMessage(encodeProtocolMessage(response));
      });
    };

    const transport = createTransport();
    await transport.connect();

    const [a, b, c] = await Promise.all([
      transport.request('gpio.read', { portNumber: 26 }),
      transport.request('gpio.read', { portNumber: 16 }),
      transport.request('gpio.read', { portNumber: 5 }),
    ]);

    expect(a.requestId).not.toBe(b.requestId);
    expect(b.requestId).not.toBe(c.requestId);
    expect(a.payload).toEqual({ value: 1 });
    expect(b.payload).toEqual({ value: 0 });
    expect(c.payload).toEqual({ value: 0 });
    expect(responses.get(a.requestId)).toBe(26);
    expect(responses.get(b.requestId)).toBe(16);
    expect(responses.get(c.requestId)).toBe(5);
  });

  it('rejects with ChirimenError on error response', async () => {
    onSend = (data, socket) => {
      const request = decodeProtocolMessage(data);
      if (!isProtocolRequest(request)) {
        throw new Error('expected protocol request');
      }
      const response: ProtocolResponse = {
        kind: 'response',
        requestId: request.requestId,
        ok: false,
        operation: request.operation,
        error: {
          code: 'ResourceBusy',
          message: 'port is busy',
        },
      };
      socket.emitMessage(encodeProtocolMessage(response));
    };

    const transport = createTransport();
    await transport.connect();

    await expect(
      transport.request('gpio.export', { portNumber: 26, direction: 'out' })
    ).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'ResourceBusy',
      message: 'port is busy',
    });
  });

  it('rejects pending requests on timeout', async () => {
    vi.useFakeTimers();
    onSend = () => {
      // 応答しない
    };

    const transport = createTransport({ timeoutMs: 1000 });
    await transport.connect();

    const pending = transport.request('gpio.read', { portNumber: 26 });
    const expectation = expect(pending).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ChirimenError &&
        error.code === 'Operation' &&
        error.message.includes('timed out')
    );

    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
    vi.useRealTimers();
  });

  it('rejects pending requests on disconnect', async () => {
    let resolveSent!: () => void;
    const sent = new Promise<void>((resolve) => {
      resolveSent = resolve;
    });
    onSend = () => {
      resolveSent();
      // 応答しない
    };

    const transport = createTransport({ timeoutMs: 60_000 });
    await transport.connect();

    const pending = transport.request('gpio.read', { portNumber: 26 });
    await sent;
    transport.disconnect();

    await expect(pending).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'DeviceUnavailable',
      message: 'WebSocket disconnected',
    });
  });

  it('forwards protocol events to onEvent', async () => {
    const events: ProtocolEvent[] = [];
    let socketRef: FakeWebSocket | null = null;
    onSend = (data, socket) => {
      socketRef = socket;
      replyWithSuccess(data, socket);
    };

    const transport = createTransport({
      onEvent: (event) => {
        events.push(event);
      },
    });
    await transport.connect();
    await transport.request('gpio.subscribe', { portNumber: 26 });

    socketRef?.emitMessage(
      encodeProtocolMessage({
        kind: 'event',
        operation: 'gpio.onchange',
        payload: { portNumber: 26, value: 1 },
      })
    );

    expect(events).toEqual([
      {
        kind: 'event',
        operation: 'gpio.onchange',
        payload: { portNumber: 26, value: 1 },
      },
    ]);
  });
});

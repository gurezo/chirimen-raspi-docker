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
  type ConnectionStatus,
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
    reconnectIntervalMs?: number;
    maxReconnectAttempts?: number;
    onEvent?: (event: ProtocolEvent) => void;
    onReconnect?: () => void;
    onStatus?: (status: ConnectionStatus, error?: ChirimenError) => void;
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
    const socketHolder: { current: FakeWebSocket | null } = { current: null };
    onSend = (data, socket) => {
      socketHolder.current = socket;
      replyWithSuccess(data, socket);
    };

    const transport = createTransport({
      onEvent: (event) => {
        events.push(event);
      },
    });
    await transport.connect();
    await transport.request('gpio.subscribe', { portNumber: 26 });

    socketHolder.current?.emitMessage(
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

  it('forwards protocol events to addEventListener listeners and onEvent', async () => {
    const onEventEvents: ProtocolEvent[] = [];
    const listenerAEvents: ProtocolEvent[] = [];
    const listenerBEvents: ProtocolEvent[] = [];
    const socketHolder: { current: FakeWebSocket | null } = { current: null };
    onSend = (data, socket) => {
      socketHolder.current = socket;
      replyWithSuccess(data, socket);
    };

    const transport = createTransport({
      onEvent: (event) => {
        onEventEvents.push(event);
      },
    });
    const listenerA = (event: ProtocolEvent) => {
      listenerAEvents.push(event);
    };
    const listenerB = (event: ProtocolEvent) => {
      listenerBEvents.push(event);
    };
    transport.addEventListener(listenerA);
    transport.addEventListener(listenerB);
    await transport.connect();
    await transport.request('gpio.subscribe', { portNumber: 26 });

    const eventMessage = {
      kind: 'event' as const,
      operation: 'gpio.onchange' as const,
      payload: { portNumber: 26, value: 1 },
    };
    socketHolder.current?.emitMessage(encodeProtocolMessage(eventMessage));

    expect(onEventEvents).toEqual([eventMessage]);
    expect(listenerAEvents).toEqual([eventMessage]);
    expect(listenerBEvents).toEqual([eventMessage]);

    transport.removeEventListener(listenerA);
    socketHolder.current?.emitMessage(
      encodeProtocolMessage({
        kind: 'event',
        operation: 'gpio.onchange',
        payload: { portNumber: 26, value: 0 },
      })
    );

    expect(listenerAEvents).toHaveLength(1);
    expect(listenerBEvents).toHaveLength(2);
    expect(onEventEvents).toHaveLength(2);
  });

  it('reconnects after unexpected close and notifies listeners', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const OriginalFake = FakeWebSocket;
    class TrackingFakeWebSocket extends OriginalFake {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    }

    const onReconnect = vi.fn();
    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: TrackingFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 100,
      onReconnect,
    });

    await transport.connect();
    expect(sockets).toHaveLength(1);

    sockets[0]?.close();
    expect(onReconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(() => {
      expect(sockets).toHaveLength(2);
    });
    await vi.waitFor(() => {
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    onSend = (data, socket) => {
      replyWithSuccess(data, socket, { value: 1 });
    };
    const response = await transport.request('gpio.read', {
      portNumber: 26,
    });
    expect(response.payload).toEqual({ value: 1 });

    vi.useRealTimers();
  });

  it('does not reconnect after manual disconnect', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    class TrackingFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    }

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: TrackingFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 100,
    });

    await transport.connect();
    transport.disconnect();
    expect(sockets).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(sockets).toHaveLength(1);

    vi.useRealTimers();
  });

  it('rejects pending on disconnect and accepts new requests after reconnect', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    class TrackingFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    }

    let resolveSent!: () => void;
    const sent = new Promise<void>((resolve) => {
      resolveSent = resolve;
    });
    onSend = () => {
      resolveSent();
      // 応答しない
    };

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: TrackingFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 50,
      timeoutMs: 60_000,
    });

    await transport.connect();
    const pending = transport.request('gpio.read', { portNumber: 26 });
    await sent;
    sockets[0]?.close();

    await expect(pending).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'DeviceUnavailable',
      message: 'WebSocket disconnected',
    });

    await vi.advanceTimersByTimeAsync(50);
    await vi.waitFor(() => {
      expect(sockets).toHaveLength(2);
    });

    onSend = (data, socket) => {
      replyWithSuccess(data, socket, { value: 0 });
    };
    const response = await transport.request('gpio.read', {
      portNumber: 26,
    });
    expect(response.payload).toEqual({ value: 0 });

    vi.useRealTimers();
  });

  it('stops reconnecting after maxReconnectAttempts', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    let openCount = 0;
    class FlakyFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
        queueMicrotask(() => {
          openCount += 1;
          if (openCount === 1) {
            this.readyState = FakeWebSocket.OPEN;
            this.onopen?.({ type: 'open' });
            return;
          }
          // reconnect 試行は失敗させる
          this.readyState = FakeWebSocket.CLOSED;
          this.onerror?.({ type: 'error' });
          this.onclose?.({ type: 'close' });
        });
      }
    }

    // autoOpen を無効化し Flaky 側で制御する
    autoOpen = false;

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: FlakyFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 20,
      maxReconnectAttempts: 2,
    });

    await transport.connect();
    expect(openCount).toBe(1);

    sockets[0]?.close();

    // reconnect 待機中に request を投げ、上限到達で reject されることを確認する
    const waiting = transport.request('gpio.read', { portNumber: 26 });
    const expectation = expect(waiting).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'DeviceUnavailable',
      message: 'WebSocket reconnect failed',
    });

    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(20);

    // 初回接続 + 失敗 2 回
    expect(openCount).toBe(3);

    await expectation;

    vi.useRealTimers();
  });

  it('starts disconnected and reports connecting then connected', async () => {
    const statuses: ConnectionStatus[] = [];
    const transport = createTransport({
      onStatus: (status) => {
        statuses.push(status);
      },
    });

    expect(transport.getStatus()).toBe('disconnected');

    const connecting = transport.connect();
    expect(transport.getStatus()).toBe('connecting');
    await connecting;

    expect(transport.getStatus()).toBe('connected');
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('notifies addStatusListener and onStatus, and ignores removed listeners', async () => {
    const onStatusEvents: ConnectionStatus[] = [];
    const listenerAEvents: ConnectionStatus[] = [];
    const listenerBEvents: ConnectionStatus[] = [];

    const transport = createTransport({
      onStatus: (status) => {
        onStatusEvents.push(status);
      },
    });
    const listenerA = (status: ConnectionStatus) => {
      listenerAEvents.push(status);
    };
    const listenerB = (status: ConnectionStatus) => {
      listenerBEvents.push(status);
    };
    transport.addStatusListener(listenerA);
    transport.addStatusListener(listenerB);

    await transport.connect();
    transport.removeStatusListener(listenerA);
    transport.disconnect();

    expect(onStatusEvents).toEqual(['connecting', 'connected', 'disconnected']);
    expect(listenerAEvents).toEqual(['connecting', 'connected']);
    expect(listenerBEvents).toEqual(['connecting', 'connected', 'disconnected']);
  });

  it('reports error when the initial connection fails', async () => {
    autoOpen = false;
    const statuses: Array<{
      status: ConnectionStatus;
      error?: ChirimenError;
    }> = [];

    class FailingFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        queueMicrotask(() => {
          this.readyState = FakeWebSocket.CLOSED;
          this.onerror?.({ type: 'error' });
          this.onclose?.({ type: 'close' });
        });
      }
    }

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: FailingFakeWebSocket as unknown as WebSocketConstructor,
      onStatus: (status, error) => {
        statuses.push({ status, error });
      },
    });

    await expect(transport.connect()).rejects.toMatchObject({
      name: 'ChirimenError',
      code: 'DeviceUnavailable',
      message: 'WebSocket connection failed',
    });

    expect(transport.getStatus()).toBe('error');
    expect(statuses.map((entry) => entry.status)).toEqual(['connecting', 'error']);
    expect(statuses[1]?.error).toMatchObject({
      name: 'ChirimenError',
      code: 'DeviceUnavailable',
      message: 'WebSocket connection failed',
    });
  });

  it('reports connecting then connected after unexpected close and reconnect', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const statuses: ConnectionStatus[] = [];
    class TrackingFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    }

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: TrackingFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 100,
      onStatus: (status) => {
        statuses.push(status);
      },
    });

    await transport.connect();
    sockets[0]?.close();
    expect(transport.getStatus()).toBe('connecting');

    await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(() => {
      expect(transport.getStatus()).toBe('connected');
    });

    expect(statuses).toEqual([
      'connecting',
      'connected',
      'connecting',
      'connected',
    ]);

    vi.useRealTimers();
  });

  it('reports error after maxReconnectAttempts', async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    let openCount = 0;
    const statuses: ConnectionStatus[] = [];
    class FlakyFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
        queueMicrotask(() => {
          openCount += 1;
          if (openCount === 1) {
            this.readyState = FakeWebSocket.OPEN;
            this.onopen?.({ type: 'open' });
            return;
          }
          this.readyState = FakeWebSocket.CLOSED;
          this.onerror?.({ type: 'error' });
          this.onclose?.({ type: 'close' });
        });
      }
    }

    autoOpen = false;

    const transport = new WebSocketClientTransport({
      url: 'ws://localhost:33330/',
      webSocketImpl: FlakyFakeWebSocket as unknown as WebSocketConstructor,
      reconnectIntervalMs: 20,
      maxReconnectAttempts: 2,
      onStatus: (status) => {
        statuses.push(status);
      },
    });

    await transport.connect();
    sockets[0]?.close();

    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(20);

    expect(transport.getStatus()).toBe('error');
    expect(statuses.at(-1)).toBe('error');

    vi.useRealTimers();
  });
});

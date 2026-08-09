import { ChirimenError } from 'core';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  isProtocolEvent,
  isProtocolResponse,
  type ProtocolEvent,
  type ProtocolOperation,
  type ProtocolRequestPayload,
  type ProtocolSuccessResponse,
  type RequestId,
  type SessionId,
} from 'protocol';

/** DI 可能な WebSocket コンストラクタ（テスト用 Fake を差し替えられる） */
export type WebSocketConstructor = new (url: string) => WebSocket;

export interface WebSocketClientTransportOptions {
  readonly url: string;
  /** 未接続時に request を送る前に待つ最大時間などは connect 側で扱う */
  readonly webSocketImpl?: WebSocketConstructor;
  readonly onEvent?: (event: ProtocolEvent) => void;
  readonly sessionId?: SessionId;
}

type PendingEntry = {
  readonly resolve: (response: ProtocolSuccessResponse) => void;
  readonly reject: (error: ChirimenError) => void;
};

type WaitQueueEntry = {
  readonly resolve: () => void;
  readonly reject: (error: ChirimenError) => void;
};

/**
 * Browser Polyfill ↔ Node server 間の WebSocket client transport。
 * protocol の JSON text frame を送受信し、requestId で Promise を相関する。
 */
export class WebSocketClientTransport {
  private readonly url: string;
  private readonly WebSocketImpl: WebSocketConstructor;
  private readonly onEvent?: (event: ProtocolEvent) => void;
  private readonly sessionId?: SessionId;

  private socket: WebSocket | null = null;
  /** 0: init / closed, 1: connecting, 2: connected */
  private status: 0 | 1 | 2 = 0;
  private nextRequestId: RequestId = 0;
  private readonly pending = new Map<RequestId, PendingEntry>();
  private waitQueue: WaitQueueEntry[] = [];

  constructor(options: WebSocketClientTransportOptions) {
    this.url = options.url;
    this.WebSocketImpl = options.webSocketImpl ?? WebSocket;
    this.onEvent = options.onEvent;
    this.sessionId = options.sessionId;
  }

  /** WebSocket を開き、open まで待つ */
  connect(): Promise<void> {
    if (this.status === 2) {
      return Promise.resolve();
    }
    if (this.status === 1) {
      return this.waitUntilConnected();
    }

    this.status = 1;
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;

    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });

      socket.onopen = () => {
        this.status = 2;
        const queue = this.waitQueue;
        this.waitQueue = [];
        for (const entry of queue) {
          entry.resolve();
        }
      };

      socket.onerror = () => {
        if (this.status === 1) {
          const error = new ChirimenError(
            'DeviceUnavailable',
            'WebSocket connection failed'
          );
          this.failWaitQueue(error);
          this.status = 0;
          this.socket = null;
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      socket.onclose = () => {
        this.status = 0;
        this.socket = null;
      };
    });
  }

  /** 接続を閉じる */
  disconnect(): void {
    const socket = this.socket;
    this.socket = null;
    this.status = 0;
    // CONNECTING(0) / OPEN(1) のときだけ close する
    if (socket !== null && socket.readyState <= 1) {
      socket.close();
    }
  }

  /**
   * protocol request を送信し、対応する success response を返す。
   * error response は ChirimenError で reject する。
   */
  async request<Op extends ProtocolOperation>(
    operation: Op,
    payload: ProtocolRequestPayload<Op>
  ): Promise<ProtocolSuccessResponse<Op>> {
    await this.ensureConnected();

    const requestId = this.allocateRequestId();
    const message = {
      kind: 'request' as const,
      requestId,
      ...(this.sessionId !== undefined ? { sessionId: this.sessionId } : {}),
      operation,
      payload,
    };

    const responsePromise = new Promise<ProtocolSuccessResponse<Op>>(
      (resolve, reject) => {
        this.pending.set(requestId, {
          resolve: resolve as (response: ProtocolSuccessResponse) => void,
          reject,
        });
      }
    );

    const socket = this.socket;
    if (socket === null || socket.readyState !== 1) {
      this.pending.delete(requestId);
      throw new ChirimenError(
        'DeviceUnavailable',
        'WebSocket is not connected'
      );
    }

    try {
      socket.send(encodeProtocolMessage(message));
    } catch (cause) {
      this.pending.delete(requestId);
      throw new ChirimenError(
        'Operation',
        'Failed to send protocol request',
        { cause }
      );
    }

    return responsePromise;
  }

  private allocateRequestId(): RequestId {
    const id = this.nextRequestId;
    this.nextRequestId = id >= 0xffff ? 0 : ((id + 1) as RequestId);
    return id;
  }

  private ensureConnected(): Promise<void> {
    if (this.status === 2) {
      return Promise.resolve();
    }
    if (this.status === 1) {
      return this.waitUntilConnected();
    }
    return this.connect();
  }

  private waitUntilConnected(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  private failWaitQueue(error: ChirimenError): void {
    const queue = this.waitQueue;
    this.waitQueue = [];
    for (const entry of queue) {
      entry.reject(error);
    }
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== 'string') {
      return;
    }

    let message;
    try {
      message = decodeProtocolMessage(data);
    } catch {
      return;
    }

    if (isProtocolResponse(message)) {
      const pending = this.pending.get(message.requestId);
      if (pending === undefined) {
        return;
      }
      this.pending.delete(message.requestId);

      if (message.ok) {
        pending.resolve(message);
      } else {
        pending.reject(
          new ChirimenError(message.error.code, message.error.message)
        );
      }
      return;
    }

    if (isProtocolEvent(message)) {
      this.onEvent?.(message);
    }
  }
}

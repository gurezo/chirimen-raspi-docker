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

/** デフォルトの request timeout（ms） */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** DI 可能な WebSocket コンストラクタ（テスト用 Fake を差し替えられる） */
export type WebSocketConstructor = new (url: string) => WebSocket;

export interface WebSocketClientTransportOptions {
  readonly url: string;
  /** request の timeout（ms）。省略時は DEFAULT_REQUEST_TIMEOUT_MS */
  readonly timeoutMs?: number;
  readonly webSocketImpl?: WebSocketConstructor;
  readonly onEvent?: (event: ProtocolEvent) => void;
  readonly sessionId?: SessionId;
}

type PendingEntry = {
  readonly resolve: (response: ProtocolSuccessResponse) => void;
  readonly reject: (error: ChirimenError) => void;
  readonly timer: ReturnType<typeof setTimeout>;
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
  private readonly timeoutMs: number;
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
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
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
        this.handleDisconnect(
          new ChirimenError(
            'DeviceUnavailable',
            'WebSocket disconnected'
          )
        );
      };
    });
  }

  /** 接続を閉じ、pending request を error にする */
  disconnect(): void {
    const socket = this.socket;
    this.handleDisconnect(
      new ChirimenError('DeviceUnavailable', 'WebSocket disconnected')
    );
    // CONNECTING(0) / OPEN(1) のときだけ close する
    if (socket !== null && socket.readyState <= 1) {
      socket.close();
    }
  }

  /**
   * protocol request を送信し、対応する success response を返す。
   * error response / timeout / disconnect は ChirimenError で reject する。
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
        const timer = setTimeout(() => {
          const pending = this.pending.get(requestId);
          if (pending === undefined) {
            return;
          }
          this.pending.delete(requestId);
          pending.reject(
            new ChirimenError(
              'Operation',
              `Protocol request timed out after ${this.timeoutMs}ms`
            )
          );
        }, this.timeoutMs);

        this.pending.set(requestId, {
          resolve: resolve as (response: ProtocolSuccessResponse) => void,
          reject,
          timer,
        });
      }
    );

    const socket = this.socket;
    if (socket === null || socket.readyState !== 1) {
      this.clearPending(requestId);
      throw new ChirimenError(
        'DeviceUnavailable',
        'WebSocket is not connected'
      );
    }

    try {
      socket.send(encodeProtocolMessage(message));
    } catch (cause) {
      this.clearPending(requestId);
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

  private handleDisconnect(error: ChirimenError): void {
    this.socket = null;
    this.status = 0;
    this.failWaitQueue(error);
    this.rejectAllPending(error);
  }

  private clearPending(requestId: RequestId): void {
    const pending = this.pending.get(requestId);
    if (pending === undefined) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(requestId);
  }

  private rejectAllPending(error: ChirimenError): void {
    const entries = [...this.pending.entries()];
    this.pending.clear();
    for (const [, pending] of entries) {
      clearTimeout(pending.timer);
      pending.reject(error);
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
      clearTimeout(pending.timer);
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

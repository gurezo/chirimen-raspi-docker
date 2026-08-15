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

/** デフォルトの reconnect 間隔（ms） */
export const DEFAULT_RECONNECT_INTERVAL_MS = 1_000;

/** DI 可能な WebSocket コンストラクタ（テスト用 Fake を差し替えられる） */
export type WebSocketConstructor = new (url: string) => WebSocket;

/** protocol event を受け取る listener */
export type ProtocolEventListener = (event: ProtocolEvent) => void;

/** reconnect 成功時に呼ばれる listener */
export type ReconnectListener = () => void;

/**
 * WebSocket の公開接続状態。
 * 内部の socket 状態（connecting / open / closed）とは別に、UI 向けの 4 状態を表す。
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** 接続状態変化時に呼ばれる listener。`error` のときだけ第 2 引数に {@link ChirimenError} を渡す */
export type ConnectionStatusListener = (
  status: ConnectionStatus,
  error?: ChirimenError
) => void;

/** WebSocket client transport の設定 */
export interface WebSocketClientTransportOptions {
  /** 接続先 WebSocket URL */
  readonly url: string;
  /** request の timeout（ms）。省略時は {@link DEFAULT_REQUEST_TIMEOUT_MS} */
  readonly timeoutMs?: number;
  /** 予期せぬ切断後の reconnect 間隔（ms）。省略時は {@link DEFAULT_RECONNECT_INTERVAL_MS} */
  readonly reconnectIntervalMs?: number;
  /**
   * 予期せぬ切断後の最大 reconnect 試行回数。
   * 省略時は Infinity（成功するまで繰り返す）。
   */
  readonly maxReconnectAttempts?: number;
  /** WebSocket 実装（テスト用 Fake 差し替え用） */
  readonly webSocketImpl?: WebSocketConstructor;
  /** 初期 event listener（`addEventListener` と併用可） */
  readonly onEvent?: ProtocolEventListener;
  /** reconnect 成功時の callback（`addReconnectListener` と併用可） */
  readonly onReconnect?: ReconnectListener;
  /** 接続状態変化時の callback（`addStatusListener` と併用可） */
  readonly onStatus?: ConnectionStatusListener;
  /** request に付与する任意の sessionId */
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
 * 予期せぬ切断時は自動 reconnect し、切断時点の pending request は reject する。
 */
export class WebSocketClientTransport {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly reconnectIntervalMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly WebSocketImpl: WebSocketConstructor;
  private readonly onEvent?: ProtocolEventListener;
  private readonly onReconnectCallback?: ReconnectListener;
  private readonly onStatusCallback?: ConnectionStatusListener;
  private readonly sessionId?: SessionId;
  private readonly eventListeners = new Set<ProtocolEventListener>();
  private readonly reconnectListeners = new Set<ReconnectListener>();
  private readonly statusListeners = new Set<ConnectionStatusListener>();

  private socket: WebSocket | null = null;
  /** 0: init / closed, 1: connecting, 2: connected */
  private status: 0 | 1 | 2 = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private nextRequestId: RequestId = 0;
  private readonly pending = new Map<RequestId, PendingEntry>();
  private waitQueue: WaitQueueEntry[] = [];
  private manualClose = false;
  private hasConnectedOnce = false;
  private reconnectAttempts = 0;
  private reconnectInProgress = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WebSocketClientTransportOptions) {
    this.url = options.url;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.reconnectIntervalMs =
      options.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL_MS;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY;
    this.WebSocketImpl = options.webSocketImpl ?? WebSocket;
    this.onEvent = options.onEvent;
    this.onReconnectCallback = options.onReconnect;
    this.onStatusCallback = options.onStatus;
    this.sessionId = options.sessionId;
  }

  /** 現在の公開接続状態 */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /** 接続状態 listener を追加する（重複登録は Set で無視） */
  addStatusListener(listener: ConnectionStatusListener): void {
    this.statusListeners.add(listener);
  }

  /** 接続状態 listener を解除する */
  removeStatusListener(listener: ConnectionStatusListener): void {
    this.statusListeners.delete(listener);
  }

  /** protocol event listener を追加する（重複登録は Set で無視） */
  addEventListener(listener: ProtocolEventListener): void {
    this.eventListeners.add(listener);
  }

  /** protocol event listener を解除する */
  removeEventListener(listener: ProtocolEventListener): void {
    this.eventListeners.delete(listener);
  }

  /** reconnect 成功 listener を追加する（重複登録は Set で無視） */
  addReconnectListener(listener: ReconnectListener): void {
    this.reconnectListeners.add(listener);
  }

  /** reconnect 成功 listener を解除する */
  removeReconnectListener(listener: ReconnectListener): void {
    this.reconnectListeners.delete(listener);
  }

  /** WebSocket を開き、open まで待つ */
  connect(): Promise<void> {
    this.manualClose = false;

    if (this.status === 2) {
      return Promise.resolve();
    }
    if (this.status === 1) {
      return this.waitUntilConnected();
    }

    this.clearReconnectTimer();
    this.status = 1;
    this.setConnectionStatus('connecting');
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;

    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });

      socket.onopen = () => {
        const isReconnect = this.hasConnectedOnce;
        this.hasConnectedOnce = true;
        this.status = 2;
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this.reconnectInProgress = false;
        const queue = this.waitQueue;
        this.waitQueue = [];
        for (const entry of queue) {
          entry.resolve();
        }
        if (isReconnect) {
          this.notifyReconnectListeners();
        }
      };

      socket.onerror = () => {
        if (this.status !== 1) {
          return;
        }
        const error = new ChirimenError(
          'DeviceUnavailable',
          'WebSocket connection failed'
        );
        this.status = 0;
        this.socket = null;
        if (this.reconnectInProgress) {
          // ensureConnected 待機者は残し、この connect() の Promise だけ reject する
          const index = this.waitQueue.findIndex(
            (entry) => entry.resolve === resolve
          );
          if (index >= 0) {
            this.waitQueue.splice(index, 1);
          }
          reject(error);
          return;
        }
        this.setConnectionStatus('error', error);
        this.failWaitQueue(error);
      };

      socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      socket.onclose = () => {
        this.handleSocketClose();
      };
    });
  }

  /**
   * 接続を閉じ、pending request を error にする。
   * 意図的な切断のため自動 reconnect は行わない。
   */
  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.handleDisconnect(
      new ChirimenError('DeviceUnavailable', 'WebSocket disconnected')
    );
    this.setConnectionStatus('disconnected');
    // CONNECTING(0) / OPEN(1) のときだけ close する
    if (socket !== null && socket.readyState <= 1) {
      socket.close();
    }
  }

  /**
   * protocol request を送信し、対応する success response を返す。
   * error response / timeout / disconnect は ChirimenError で reject する。
   *
   * @param operation - protocol operation 名
   * @param payload - operation に対応する request payload
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
    if (this.reconnectTimer !== null) {
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

  private handleSocketClose(): void {
    // reconnect 試行中の失敗は scheduleReconnect 側で再スケジュールする
    const shouldReconnect =
      !this.manualClose &&
      this.hasConnectedOnce &&
      !this.reconnectInProgress;
    // disconnect() 済みなら cleanup 済み。onclose の二重呼び出しを無視する
    if (this.status !== 0 || this.socket !== null) {
      this.handleDisconnect(
        new ChirimenError(
          'DeviceUnavailable',
          'WebSocket disconnected'
        )
      );
    }
    if (shouldReconnect) {
      this.setConnectionStatus('connecting');
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(error: ChirimenError): void {
    this.socket = null;
    this.status = 0;
    this.failWaitQueue(error);
    this.rejectAllPending(error);
  }

  private scheduleReconnect(): void {
    if (this.manualClose) {
      return;
    }
    if (this.reconnectTimer !== null) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new ChirimenError(
        'DeviceUnavailable',
        'WebSocket reconnect failed'
      );
      this.setConnectionStatus('error', error);
      this.failWaitQueue(error);
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.manualClose) {
        return;
      }
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        const error = new ChirimenError(
          'DeviceUnavailable',
          'WebSocket reconnect failed'
        );
        this.setConnectionStatus('error', error);
        this.failWaitQueue(error);
        return;
      }

      this.reconnectAttempts += 1;
      this.reconnectInProgress = true;
      void this.connect().then(
        () => {
          this.reconnectInProgress = false;
        },
        () => {
          this.reconnectInProgress = false;
          if (this.manualClose) {
            return;
          }
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            const error = new ChirimenError(
              'DeviceUnavailable',
              'WebSocket reconnect failed'
            );
            this.setConnectionStatus('error', error);
            this.failWaitQueue(error);
            return;
          }
          this.setConnectionStatus('connecting');
          this.scheduleReconnect();
        }
      );
    }, this.reconnectIntervalMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private notifyReconnectListeners(): void {
    this.onReconnectCallback?.();
    for (const listener of this.reconnectListeners) {
      listener();
    }
  }

  private setConnectionStatus(
    status: ConnectionStatus,
    error?: ChirimenError
  ): void {
    if (this.connectionStatus === status && status !== 'error') {
      return;
    }
    this.connectionStatus = status;
    this.onStatusCallback?.(status, error);
    for (const listener of this.statusListeners) {
      listener(status, error);
    }
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
      for (const listener of this.eventListeners) {
        listener(message);
      }
    }
  }
}

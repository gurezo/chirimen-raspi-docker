import {
  DEFAULT_RECONNECT_INTERVAL_MS,
  installBrowserPolyfill,
  type ConnectionStatus,
  type WebSocketClientTransport,
  type WebSocketClientTransportOptions,
} from 'browser-polyfill';

/** Browser demo の表示タイトル */
export const WEB_DEMO_TITLE = 'CHIRIMEN web-demo' as const;

/** Runtime の default WebSocket URL（IIFE と同じ `ws://localhost:33330/`） */
export const WEB_DEMO_RUNTIME_WS_URL = 'ws://localhost:33330/' as const;

/** Issue #103 で指定された UI ラベル */
export const CONNECTION_STATUS_LABELS = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error',
} as const;

/** 接続失敗時に Runtime 起動を確認するための案内 */
export const CONNECTION_ERROR_HELP_LINES = [
  'Runtime が起動しているか確認してください。',
  './scripts/start.sh で Runtime を起動する',
  'curl http://localhost:33330/health で応答を確認する',
  `接続先は ${WEB_DEMO_RUNTIME_WS_URL}`,
  '詳細は docs/guides/getting-started.md と docs/guides/troubleshooting.md を参照',
] as const;

/** 接続状態 UI の表示内容 */
export interface ConnectionStatusView {
  readonly label: (typeof CONNECTION_STATUS_LABELS)[ConnectionStatus];
  readonly url: typeof WEB_DEMO_RUNTIME_WS_URL;
  readonly helpLines: readonly string[];
}

export type { ConnectionStatus };

/**
 * web-demo から Browser Polyfill を install する。
 * 成功後に `navigator.requestGPIOAccess` / `requestI2CAccess` が使える。
 *
 * @param options - `url` 以外の transport 設定（テスト用 `webSocketImpl` など）
 */
export async function installWebDemoPolyfill(
  options?: Omit<WebSocketClientTransportOptions, 'url'>
): Promise<WebSocketClientTransport> {
  return installBrowserPolyfill({
    ...options,
    url: WEB_DEMO_RUNTIME_WS_URL,
  });
}

/**
 * 接続状態を UI 向けのラベル / ヘルプに変換する。
 */
export function getConnectionStatusView(
  status: ConnectionStatus
): ConnectionStatusView {
  return {
    label: CONNECTION_STATUS_LABELS[status],
    url: WEB_DEMO_RUNTIME_WS_URL,
    helpLines: status === 'error' ? [...CONNECTION_ERROR_HELP_LINES] : [],
  };
}

export type ConnectWebDemoRuntimeOptions = Omit<
  WebSocketClientTransportOptions,
  'url'
> & {
  /** 初回接続失敗後の再試行間隔（ms）。省略時は {@link DEFAULT_RECONNECT_INTERVAL_MS} */
  readonly retryIntervalMs?: number;
};

/**
 * Runtime へ接続し、初回失敗時は再試行する。
 * 一度成功したあとの切断は transport の reconnect に任せる。
 */
export async function connectWebDemoRuntime(
  options: ConnectWebDemoRuntimeOptions = {}
): Promise<WebSocketClientTransport> {
  const { retryIntervalMs = DEFAULT_RECONNECT_INTERVAL_MS, ...transportOptions } =
    options;

  for (;;) {
    try {
      return await installWebDemoPolyfill(transportOptions);
    } catch {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, retryIntervalMs);
      });
    }
  }
}

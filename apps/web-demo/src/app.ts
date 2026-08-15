import {
  installBrowserPolyfill,
  type WebSocketClientTransport,
  type WebSocketClientTransportOptions,
} from 'browser-polyfill';

/** Browser demo の表示タイトル */
export const WEB_DEMO_TITLE = 'CHIRIMEN web-demo' as const;

/** Runtime の default WebSocket URL（IIFE と同じ `ws://localhost:33330/`） */
export const WEB_DEMO_RUNTIME_WS_URL = 'ws://localhost:33330/' as const;

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

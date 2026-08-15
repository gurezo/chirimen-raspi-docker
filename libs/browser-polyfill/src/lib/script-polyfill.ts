import type { GpioAccess } from 'gpio';
import type { I2CAccess } from 'i2c';

import {
  getNavigator,
  installBrowserPolyfill as installBrowserPolyfillImpl,
  isBrowserPolyfillInstalled,
  requestGPIOAccess,
  requestI2CAccess,
} from './navigator-polyfill.js';

/** IIFE / script tag 読み込み時の default WebSocket URL（旧 polyfill の `wss://` ではなく `ws://`） */
export const DEFAULT_BROWSER_POLYFILL_WS_URL = 'ws://localhost:33330/';

declare global {
  // script 読み込み前に設定する任意の WebSocket URL
  var CHIRIMEN_WS_URL: string | undefined;
  var installBrowserPolyfill: typeof installBrowserPolyfillImpl;
}

/**
 * IIFE が使う接続先 URL。
 * `globalThis.CHIRIMEN_WS_URL` があればそれを使い、無ければ default。
 */
export function resolveBrowserPolyfillWsUrl(): string {
  const configured = globalThis.CHIRIMEN_WS_URL;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  return DEFAULT_BROWSER_POLYFILL_WS_URL;
}

async function ensureScriptPolyfillInstalled(): Promise<void> {
  if (isBrowserPolyfillInstalled()) {
    return;
  }
  await installBrowserPolyfillImpl({ url: resolveBrowserPolyfillWsUrl() });
}

/** 未 install なら default URL で接続してから {@link requestGPIOAccess} する */
export async function requestGPIOAccessFromScript(): Promise<GpioAccess> {
  await ensureScriptPolyfillInstalled();
  return requestGPIOAccess();
}

/** 未 install なら default URL で接続してから {@link requestI2CAccess} する */
export async function requestI2CAccessFromScript(): Promise<I2CAccess> {
  await ensureScriptPolyfillInstalled();
  return requestI2CAccess();
}

/**
 * 旧 `polyfill.js` 相当の script 入口。
 * `navigator.requestGPIOAccess` / `requestI2CAccess` と
 * `globalThis.installBrowserPolyfill` を登録する。
 */
export function attachScriptPolyfill(): void {
  const navigatorRef = getNavigator();
  navigatorRef.requestGPIOAccess = requestGPIOAccessFromScript;
  navigatorRef.requestI2CAccess = requestI2CAccessFromScript;
  globalThis.installBrowserPolyfill = installBrowserPolyfillImpl;
}

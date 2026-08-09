import { ChirimenError } from 'core';
import type { GpioAccess } from 'gpio';

import { BrowserGpioAccess } from './browser-gpio-access.js';
import {
  WebSocketClientTransport,
  type WebSocketClientTransportOptions,
} from './websocket-client-transport.js';

declare global {
  interface Navigator {
    requestGPIOAccess(): Promise<GpioAccess>;
  }
}

let sharedTransport: WebSocketClientTransport | null = null;

/**
 * WebSocket transport を接続し、navigator.requestGPIOAccess を登録する。
 * 既存の requestGPIOAccess があっても上書きする（再 install を許容）。
 */
export async function installBrowserPolyfill(
  options: WebSocketClientTransportOptions
): Promise<WebSocketClientTransport> {
  const transport = new WebSocketClientTransport(options);
  await transport.connect();
  sharedTransport = transport;

  const navigatorRef = getNavigator();
  navigatorRef.requestGPIOAccess = requestGPIOAccess;

  return transport;
}

/**
 * 共有 transport から GpioAccess を返す。
 * installBrowserPolyfill 呼び出し前は ChirimenError を投げる。
 */
export async function requestGPIOAccess(): Promise<GpioAccess> {
  const transport = sharedTransport;
  if (transport === null) {
    throw new ChirimenError(
      'InvalidAccess',
      'Browser polyfill is not installed. Call installBrowserPolyfill() first.'
    );
  }
  await transport.connect();
  return new BrowserGpioAccess(transport);
}

/** テスト用: 共有 transport / navigator 登録を解除する */
export function resetBrowserPolyfillForTests(): void {
  sharedTransport = null;
  const navigatorRef = globalThis.navigator as Navigator | undefined;
  if (navigatorRef && 'requestGPIOAccess' in navigatorRef) {
    delete (navigatorRef as Partial<Navigator>).requestGPIOAccess;
  }
}

function getNavigator(): Navigator {
  if (typeof globalThis.navigator === 'undefined') {
    const stub = {} as Navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: stub,
      writable: true,
      configurable: true,
    });
    return stub;
  }
  return globalThis.navigator;
}

export {};

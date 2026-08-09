import { ChirimenError } from 'core';
import type { GpioAccess } from 'gpio';
import type { I2CAccess } from 'i2c';

import { BrowserGpioAccess } from './browser-gpio-access.js';
import { BrowserI2CAccess } from './browser-i2c-access.js';
import {
  WebSocketClientTransport,
  type WebSocketClientTransportOptions,
} from './websocket-client-transport.js';

declare global {
  interface Navigator {
    requestGPIOAccess(): Promise<GpioAccess>;
    requestI2CAccess(): Promise<I2CAccess>;
  }
}

let sharedTransport: WebSocketClientTransport | null = null;

/**
 * WebSocket transport を接続し、navigator.requestGPIOAccess / requestI2CAccess を登録する。
 * 既存の API があっても上書きする（再 install を許容）。
 */
export async function installBrowserPolyfill(
  options: WebSocketClientTransportOptions
): Promise<WebSocketClientTransport> {
  const transport = new WebSocketClientTransport(options);
  await transport.connect();
  sharedTransport = transport;

  const navigatorRef = getNavigator();
  navigatorRef.requestGPIOAccess = requestGPIOAccess;
  navigatorRef.requestI2CAccess = requestI2CAccess;

  return transport;
}

/**
 * 共有 transport から GpioAccess を返す。
 * installBrowserPolyfill 呼び出し前は ChirimenError を投げる。
 */
export async function requestGPIOAccess(): Promise<GpioAccess> {
  const transport = requireSharedTransport();
  await transport.connect();
  return new BrowserGpioAccess(transport);
}

/**
 * 共有 transport から I2CAccess を返す。
 * installBrowserPolyfill 呼び出し前は ChirimenError を投げる。
 */
export async function requestI2CAccess(): Promise<I2CAccess> {
  const transport = requireSharedTransport();
  await transport.connect();
  return new BrowserI2CAccess(transport);
}

/** テスト用: 共有 transport / navigator 登録を解除する */
export function resetBrowserPolyfillForTests(): void {
  sharedTransport = null;
  const navigatorRef = globalThis.navigator as Navigator | undefined;
  if (navigatorRef && 'requestGPIOAccess' in navigatorRef) {
    delete (navigatorRef as Partial<Navigator>).requestGPIOAccess;
  }
  if (navigatorRef && 'requestI2CAccess' in navigatorRef) {
    delete (navigatorRef as Partial<Navigator>).requestI2CAccess;
  }
}

function requireSharedTransport(): WebSocketClientTransport {
  const transport = sharedTransport;
  if (transport === null) {
    throw new ChirimenError(
      'InvalidAccess',
      'Browser polyfill is not installed. Call installBrowserPolyfill() first.'
    );
  }
  return transport;
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

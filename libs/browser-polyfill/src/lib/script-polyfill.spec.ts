import { ChirimenError } from 'core';

import {
  isBrowserPolyfillInstalled,
  requestGPIOAccess,
  requestI2CAccess,
  resetBrowserPolyfillForTests,
} from './navigator-polyfill.js';
import {
  attachScriptPolyfill,
  DEFAULT_BROWSER_POLYFILL_WS_URL,
  resolveBrowserPolyfillWsUrl,
} from './script-polyfill.js';
import type { WebSocketConstructor } from './websocket-client-transport.js';

let autoOpen = true;
const constructedUrls: string[] = [];

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
    constructedUrls.push(url);
    queueMicrotask(() => {
      if (!autoOpen) {
        return;
      }
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.({ type: 'open' });
    });
  }

  send(): void {
    // script polyfill の接続確認では protocol 応答は不要
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ type: 'close' });
  }
}

const OriginalWebSocket = globalThis.WebSocket;

describe('script polyfill (IIFE entry)', () => {
  beforeEach(() => {
    autoOpen = true;
    constructedUrls.length = 0;
    resetBrowserPolyfillForTests();
    delete globalThis.CHIRIMEN_WS_URL;
    delete (globalThis as { installBrowserPolyfill?: unknown }).installBrowserPolyfill;
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    resetBrowserPolyfillForTests();
    delete globalThis.CHIRIMEN_WS_URL;
    delete (globalThis as { installBrowserPolyfill?: unknown }).installBrowserPolyfill;
    globalThis.WebSocket = OriginalWebSocket;
  });

  it('registers navigator APIs and installBrowserPolyfill on attach', () => {
    expect(typeof navigator.requestGPIOAccess).toBe('undefined');
    expect(typeof navigator.requestI2CAccess).toBe('undefined');

    attachScriptPolyfill();

    expect(typeof navigator.requestGPIOAccess).toBe('function');
    expect(typeof navigator.requestI2CAccess).toBe('function');
    expect(typeof globalThis.installBrowserPolyfill).toBe('function');
  });

  it('resolves default WebSocket URL and CHIRIMEN_WS_URL override', () => {
    expect(resolveBrowserPolyfillWsUrl()).toBe(DEFAULT_BROWSER_POLYFILL_WS_URL);

    globalThis.CHIRIMEN_WS_URL = '';
    expect(resolveBrowserPolyfillWsUrl()).toBe(DEFAULT_BROWSER_POLYFILL_WS_URL);

    globalThis.CHIRIMEN_WS_URL = 'ws://192.168.1.10:33330/';
    expect(resolveBrowserPolyfillWsUrl()).toBe('ws://192.168.1.10:33330/');
  });

  it('lazy-installs with the default URL on first requestGPIOAccess', async () => {
    attachScriptPolyfill();

    expect(isBrowserPolyfillInstalled()).toBe(false);

    const access = await navigator.requestGPIOAccess();

    expect(isBrowserPolyfillInstalled()).toBe(true);
    expect(constructedUrls).toEqual([DEFAULT_BROWSER_POLYFILL_WS_URL]);
    expect(access.ports.get(26)?.portNumber).toBe(26);
  });

  it('lazy-installs with CHIRIMEN_WS_URL when set before attach', async () => {
    globalThis.CHIRIMEN_WS_URL = 'ws://192.168.1.10:33330/';
    attachScriptPolyfill();

    await navigator.requestI2CAccess();

    expect(constructedUrls).toEqual(['ws://192.168.1.10:33330/']);
  });

  it('does not reconnect on a subsequent request*Access after lazy install', async () => {
    attachScriptPolyfill();

    await navigator.requestGPIOAccess();
    expect(constructedUrls).toHaveLength(1);

    const i2cAccess = await navigator.requestI2CAccess();
    expect(constructedUrls).toHaveLength(1);
    expect(i2cAccess.ports.get(1)?.portNumber).toBe(1);
  });

  it('uses an explicit installBrowserPolyfill URL instead of the default', async () => {
    attachScriptPolyfill();

    await globalThis.installBrowserPolyfill({
      url: 'ws://custom-host:33330/',
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    const access = await navigator.requestGPIOAccess();

    expect(constructedUrls).toEqual(['ws://custom-host:33330/']);
    expect(access.ports.get(26)?.portNumber).toBe(26);
  });

  it('keeps ESM request*Access throwing when not installed', async () => {
    await expect(requestGPIOAccess()).rejects.toBeInstanceOf(ChirimenError);
    await expect(requestI2CAccess()).rejects.toMatchObject({
      code: 'InvalidAccess',
    });
    expect(isBrowserPolyfillInstalled()).toBe(false);
  });
});

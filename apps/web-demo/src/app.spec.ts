import {
  WEB_DEMO_RUNTIME_WS_URL,
  WEB_DEMO_TITLE,
  installWebDemoPolyfill,
} from './app.js';
import type { WebSocketConstructor } from 'browser-polyfill';

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
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.({ type: 'open' });
    });
  }

  send(): void {
    // install の接続確認では protocol 応答は不要
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ type: 'close' });
  }
}

describe('web-demo', () => {
  beforeEach(() => {
    constructedUrls.length = 0;
  });

  it('exposes the application title', () => {
    expect(WEB_DEMO_TITLE).toBe('CHIRIMEN web-demo');
  });

  it('registers navigator.requestGPIOAccess and requestI2CAccess after install', async () => {
    await installWebDemoPolyfill({
      webSocketImpl: FakeWebSocket as unknown as WebSocketConstructor,
    });

    expect(typeof navigator.requestGPIOAccess).toBe('function');
    expect(typeof navigator.requestI2CAccess).toBe('function');
    expect(constructedUrls).toEqual([WEB_DEMO_RUNTIME_WS_URL]);
  });
});

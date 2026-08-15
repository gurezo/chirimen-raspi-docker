import {
  CONNECTION_ERROR_HELP_LINES,
  WEB_DEMO_RUNTIME_WS_URL,
  WEB_DEMO_TITLE,
  connectWebDemoRuntime,
  getConnectionStatusView,
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

  it('maps connection status to UI labels and Error help', () => {
    expect(getConnectionStatusView('disconnected')).toEqual({
      label: 'Disconnected',
      url: WEB_DEMO_RUNTIME_WS_URL,
      helpLines: [],
    });
    expect(getConnectionStatusView('connecting')).toEqual({
      label: 'Connecting',
      url: WEB_DEMO_RUNTIME_WS_URL,
      helpLines: [],
    });
    expect(getConnectionStatusView('connected')).toEqual({
      label: 'Connected',
      url: WEB_DEMO_RUNTIME_WS_URL,
      helpLines: [],
    });

    const errorView = getConnectionStatusView('error');
    expect(errorView.label).toBe('Error');
    expect(errorView.url).toBe(WEB_DEMO_RUNTIME_WS_URL);
    expect(errorView.helpLines).toEqual([...CONNECTION_ERROR_HELP_LINES]);
    expect(errorView.helpLines).toContain(
      'Runtime が起動しているか確認してください。'
    );
    expect(errorView.helpLines).toContain(
      './scripts/start.sh で Runtime を起動する'
    );
    expect(errorView.helpLines).toContain(
      'curl http://localhost:33330/health で応答を確認する'
    );
  });

  it('retries Runtime connection after the initial attempt fails', async () => {
    vi.useFakeTimers();
    let attempt = 0;

    class FlakyFakeWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readyState = FlakyFakeWebSocket.CONNECTING;
      onopen: ((event: FakeOpenEvent) => void) | null = null;
      onclose: ((event: FakeCloseEvent) => void) | null = null;
      onerror: ((event: FakeErrorEvent) => void) | null = null;
      onmessage: ((event: FakeMessageEvent) => void) | null = null;

      constructor(public readonly url: string) {
        constructedUrls.push(url);
        attempt += 1;
        const currentAttempt = attempt;
        queueMicrotask(() => {
          if (currentAttempt === 1) {
            this.readyState = FlakyFakeWebSocket.CLOSED;
            this.onerror?.({ type: 'error' });
            this.onclose?.({ type: 'close' });
            return;
          }
          this.readyState = FlakyFakeWebSocket.OPEN;
          this.onopen?.({ type: 'open' });
        });
      }

      send(): void {
        // install の接続確認では protocol 応答は不要
      }

      close(): void {
        if (this.readyState === FlakyFakeWebSocket.CLOSED) {
          return;
        }
        this.readyState = FlakyFakeWebSocket.CLOSED;
        this.onclose?.({ type: 'close' });
      }
    }

    const pending = connectWebDemoRuntime({
      webSocketImpl: FlakyFakeWebSocket as unknown as WebSocketConstructor,
      retryIntervalMs: 50,
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    await pending;

    expect(attempt).toBe(2);
    expect(constructedUrls).toEqual([
      WEB_DEMO_RUNTIME_WS_URL,
      WEB_DEMO_RUNTIME_WS_URL,
    ]);
    expect(typeof navigator.requestGPIOAccess).toBe('function');

    vi.useRealTimers();
  });
});

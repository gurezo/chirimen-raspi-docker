import type { ConnectionStatus } from './app.js';
import type { DemoRouteId } from './navigation.js';

/** `hashchange` / `pagehide` を購読する EventTarget */
export type LedBlinkCleanupEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

/** LED Blink を止めて GPIO を解放するタイミングの配線 */
export interface BindLedBlinkCleanupOptions {
  readonly stop: () => void | Promise<void>;
  readonly getRoute: () => DemoRouteId;
  readonly addStatusListener: (
    listener: (status: ConnectionStatus) => void
  ) => () => void;
  readonly target?: LedBlinkCleanupEventTarget;
}

/**
 * GPIO Output 画面以外へ移ったら Blink を止める。
 */
export function shouldStopLedBlinkOnRoute(routeId: DemoRouteId): boolean {
  return routeId !== 'gpio-output';
}

/**
 * Runtime が Connected でなくなったら Blink を止める。
 * 予期せぬ切断は reconnect 中 `connecting` になるため、`connected` 以外を対象にする。
 */
export function shouldStopLedBlinkOnConnectionStatus(
  status: ConnectionStatus
): boolean {
  return status !== 'connected';
}

/**
 * 画面遷移 / reload（pagehide）/ WebSocket 切断で `stop` を呼ぶ。
 * 返値は listener を外す unbind。
 */
export function bindLedBlinkCleanup(
  options: BindLedBlinkCleanupOptions
): () => void {
  const target = options.target ?? window;
  const { stop, getRoute, addStatusListener } = options;

  const onHashChange = (): void => {
    if (shouldStopLedBlinkOnRoute(getRoute())) {
      void stop();
    }
  };

  const onPageHide = (): void => {
    void stop();
  };

  const onStatus = (status: ConnectionStatus): void => {
    if (shouldStopLedBlinkOnConnectionStatus(status)) {
      void stop();
    }
  };

  target.addEventListener('hashchange', onHashChange);
  target.addEventListener('pagehide', onPageHide);
  const unbindStatus = addStatusListener(onStatus);

  return (): void => {
    target.removeEventListener('hashchange', onHashChange);
    target.removeEventListener('pagehide', onPageHide);
    unbindStatus();
  };
}

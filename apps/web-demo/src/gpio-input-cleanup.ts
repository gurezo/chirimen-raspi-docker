import type { ConnectionStatus } from './app.js';
import type { DemoRouteId } from './navigation.js';

/** `hashchange` / `pagehide` を購読する EventTarget */
export type GpioInputCleanupEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

/** GPIO Input を止めて watch / GPIO を解放するタイミングの配線 */
export interface BindGpioInputCleanupOptions {
  readonly stop: () => void | Promise<void>;
  readonly getRoute: () => DemoRouteId;
  readonly addStatusListener: (
    listener: (status: ConnectionStatus) => void
  ) => () => void;
  readonly target?: GpioInputCleanupEventTarget;
}

/**
 * GPIO Input 画面以外へ移ったら session を止める。
 */
export function shouldStopGpioInputOnRoute(routeId: DemoRouteId): boolean {
  return routeId !== 'gpio-input';
}

/**
 * Runtime が Connected でなくなったら Input session を止める。
 * 予期せぬ切断は reconnect 中 `connecting` になるため、`connected` 以外を対象にする。
 */
export function shouldStopGpioInputOnConnectionStatus(
  status: ConnectionStatus
): boolean {
  return status !== 'connected';
}

/**
 * 画面遷移 / reload（pagehide）/ WebSocket 切断で `stop` を呼ぶ。
 * 返値は listener を外す unbind。
 */
export function bindGpioInputCleanup(
  options: BindGpioInputCleanupOptions
): () => void {
  const target = options.target ?? window;
  const { stop, getRoute, addStatusListener } = options;

  const onHashChange = (): void => {
    if (shouldStopGpioInputOnRoute(getRoute())) {
      void stop();
    }
  };

  const onPageHide = (): void => {
    void stop();
  };

  const onStatus = (status: ConnectionStatus): void => {
    if (shouldStopGpioInputOnConnectionStatus(status)) {
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

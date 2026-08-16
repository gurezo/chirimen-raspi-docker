import type { ConnectionStatus } from './app.js';
import type { DemoRouteId } from './navigation.js';

/** `hashchange` / `pagehide` を購読する EventTarget */
export type I2cScanCleanupEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

/** I2C Scan を中断するタイミングの配線 */
export interface BindI2cScanCleanupOptions {
  readonly stop: () => void | Promise<void>;
  readonly getRoute: () => DemoRouteId;
  readonly addStatusListener: (
    listener: (status: ConnectionStatus) => void
  ) => () => void;
  readonly target?: I2cScanCleanupEventTarget;
}

/**
 * I2C Scan 画面以外へ移ったら走査を中断する。
 */
export function shouldStopI2cScanOnRoute(routeId: DemoRouteId): boolean {
  return routeId !== 'i2c-scan';
}

/**
 * Runtime が Connected でなくなったら走査を中断する。
 * 予期せぬ切断は reconnect 中 `connecting` になるため、`connected` 以外を対象にする。
 */
export function shouldStopI2cScanOnConnectionStatus(
  status: ConnectionStatus
): boolean {
  return status !== 'connected';
}

/**
 * 画面遷移 / reload（pagehide）/ WebSocket 切断で `stop` を呼ぶ。
 * 返値は listener を外す unbind。
 */
export function bindI2cScanCleanup(
  options: BindI2cScanCleanupOptions
): () => void {
  const target = options.target ?? window;
  const { stop, getRoute, addStatusListener } = options;

  const onHashChange = (): void => {
    if (shouldStopI2cScanOnRoute(getRoute())) {
      void stop();
    }
  };

  const onPageHide = (): void => {
    void stop();
  };

  const onStatus = (status: ConnectionStatus): void => {
    if (shouldStopI2cScanOnConnectionStatus(status)) {
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

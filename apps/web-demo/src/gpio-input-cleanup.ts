import type { DemoRouteId } from './navigation.js';

/**
 * GPIO Input 画面以外へ移ったら session を止める。
 */
export function shouldStopGpioInputOnRoute(routeId: DemoRouteId): boolean {
  return routeId !== 'gpio-input';
}

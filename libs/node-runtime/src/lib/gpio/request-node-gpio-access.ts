import type { GpioAccess } from 'gpio';
import { requestGPIOAccess } from 'node-web-gpio';
import { NodeWebGpioAccessAdapter } from './gpio-access-adapter.js';
import { mapGpioError } from './map-gpio-error.js';

/**
 * node-web-gpio の requestGPIOAccess を呼び、domain GpioAccess を返す。
 */
export async function requestNodeGpioAccess(): Promise<GpioAccess> {
  try {
    const nativeAccess = await requestGPIOAccess();
    return new NodeWebGpioAccessAdapter(nativeAccess);
  } catch (error) {
    throw mapGpioError(error);
  }
}

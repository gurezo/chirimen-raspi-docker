import type { I2CAccess } from 'i2c';
import { requestI2CAccess } from 'node-web-i2c';
import { NodeWebI2CAccessAdapter } from './i2c-access-adapter.js';
import { mapI2cError } from './map-i2c-error.js';

/**
 * node-web-i2c の requestI2CAccess を呼び、domain I2CAccess を返す。
 */
export async function requestNodeI2CAccess(): Promise<I2CAccess> {
  try {
    const nativeAccess = await requestI2CAccess();
    return new NodeWebI2CAccessAdapter(nativeAccess);
  } catch (error) {
    throw mapI2cError(error);
  }
}

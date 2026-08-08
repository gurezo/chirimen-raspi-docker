import {
  isI2CPortNumber,
  type I2CAccess,
  type I2CPort,
  type I2CPortMap,
  type I2CPortNumber,
} from 'i2c';
import type { I2CAccess as NativeI2CAccess } from 'node-web-i2c';
import { NodeWebI2CPortAdapter } from './i2c-port-adapter.js';

/**
 * node-web-i2c の I2CAccess を domain I2CAccess へ委譲する adapter。
 */
export class NodeWebI2CAccessAdapter implements I2CAccess {
  readonly ports: I2CPortMap;

  constructor(nativeAccess: NativeI2CAccess) {
    const map = new Map<I2CPortNumber, I2CPort>();
    for (const [portNumber, nativePort] of nativeAccess.ports) {
      if (!isI2CPortNumber(portNumber)) {
        continue;
      }
      map.set(portNumber, new NodeWebI2CPortAdapter(nativePort));
    }
    this.ports = map;
  }
}

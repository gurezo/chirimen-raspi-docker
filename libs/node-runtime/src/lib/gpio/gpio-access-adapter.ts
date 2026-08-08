import {
  isGpioPortNumber,
  type GpioAccess,
  type GpioPort,
  type GpioPortMap,
  type GpioPortNumber,
} from 'gpio';
import type { GPIOAccess as NativeGpioAccess } from 'node-web-gpio';
import { NodeWebGpioPortAdapter } from './gpio-port-adapter.js';
import { mapGpioError } from './map-gpio-error.js';

/**
 * node-web-gpio の GPIOAccess を domain GpioAccess へ委譲する adapter。
 */
export class NodeWebGpioAccessAdapter implements GpioAccess {
  readonly ports: GpioPortMap;
  readonly #nativeAccess: NativeGpioAccess;

  constructor(nativeAccess: NativeGpioAccess) {
    const map = new Map<GpioPortNumber, GpioPort>();
    for (const [portNumber, nativePort] of nativeAccess.ports) {
      if (!isGpioPortNumber(portNumber)) {
        continue;
      }
      map.set(portNumber, new NodeWebGpioPortAdapter(nativePort));
    }
    this.ports = map;
    this.#nativeAccess = nativeAccess;
  }

  async unexportAll(): Promise<void> {
    try {
      await this.#nativeAccess.unexportAll();
    } catch (error) {
      throw mapGpioError(error);
    }
  }
}

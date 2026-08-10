import type { HardwareCapabilities } from 'core';
import type { GpioAccess } from 'gpio';
import type { I2CAccess } from 'i2c';
import { requestNodeGpioAccess } from '../gpio/request-node-gpio-access.js';
import { requestNodeI2CAccess } from '../i2c/request-node-i2c-access.js';

/**
 * GPIO backend 選択結果。
 * Sysfs は既存の node-web-gpio adapter を利用する。
 * gpiochip は未実装のため明示的に Unsupported とする。
 */
export type GpioBackendSelection =
  | { kind: 'sysfs'; access: GpioAccess }
  | { kind: 'unsupported'; backend: 'gpiochip'; reason: string }
  | { kind: 'unavailable' };

/** I2C backend 選択結果。i2c-dev のときのみ node-web-i2c を作成する。 */
export type I2cBackendSelection =
  | { kind: 'i2c-dev'; access: I2CAccess }
  | { kind: 'unavailable' };

export interface RuntimeBackendSelection {
  gpio: GpioBackendSelection;
  i2c: I2cBackendSelection;
}

const GPIOCHIP_UNSUPPORTED_REASON =
  'gpiochip backend is not implemented; GPIO unavailable';

/**
 * HardwareCapabilities から起動時に一度だけ Runtime backend を選択する。
 * Browser / Protocol / WebSocket は Raspberry Pi model を知らず、ここで差を吸収する。
 */
export async function selectRuntimeBackends(
  capabilities: HardwareCapabilities
): Promise<RuntimeBackendSelection> {
  const gpio = await selectGpioBackend(capabilities.gpio.backend);
  const i2c = await selectI2cBackend(capabilities.i2c.backend);
  return { gpio, i2c };
}

async function selectGpioBackend(
  backend: HardwareCapabilities['gpio']['backend']
): Promise<GpioBackendSelection> {
  switch (backend) {
    case 'sysfs': {
      // Sysfs backend: 既存の node-web-gpio（/sys/class/gpio）実装
      try {
        const access = await requestNodeGpioAccess();
        return { kind: 'sysfs', access };
      } catch {
        return { kind: 'unavailable' };
      }
    }
    case 'gpiochip':
      return {
        kind: 'unsupported',
        backend: 'gpiochip',
        reason: GPIOCHIP_UNSUPPORTED_REASON,
      };
    case 'unavailable':
      return { kind: 'unavailable' };
  }
}

async function selectI2cBackend(
  backend: HardwareCapabilities['i2c']['backend']
): Promise<I2cBackendSelection> {
  switch (backend) {
    case 'i2c-dev': {
      try {
        const access = await requestNodeI2CAccess();
        return { kind: 'i2c-dev', access };
      } catch {
        return { kind: 'unavailable' };
      }
    }
    case 'unavailable':
      return { kind: 'unavailable' };
  }
}

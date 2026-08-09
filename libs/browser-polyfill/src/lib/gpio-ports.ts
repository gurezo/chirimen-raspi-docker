import type { GpioPortNumber } from 'gpio';

/**
 * CHIRIMEN polyfill.js の gpioPorts と同じ Raspberry Pi BCM ピン一覧。
 * @see https://github.com/chirimen-oh/chirimen/blob/master/gc/polyfill/polyfill.js
 */
export const CHIRIMEN_GPIO_PORTS = [
  4, 17, 18, 27, 22, 23, 24, 25, 5, 6, 12, 13, 19, 16, 26, 20, 21,
] as const satisfies readonly GpioPortNumber[];

import { CHIRIMEN_GPIO_PORTS } from 'browser-polyfill';
import { LED_BLINK_GPIO_PORT } from './gpio-led-blink.js';

describe('LED Blink GPIO port', () => {
  it('uses BCM 26 as the circuit pin', () => {
    expect(LED_BLINK_GPIO_PORT).toBe(26);
  });

  it('is included in CHIRIMEN polyfill GPIO ports', () => {
    expect(CHIRIMEN_GPIO_PORTS).toContain(LED_BLINK_GPIO_PORT);
  });
});

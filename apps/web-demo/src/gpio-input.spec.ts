import { CHIRIMEN_GPIO_PORTS } from 'browser-polyfill';
import { GPIO_INPUT_PORT } from './gpio-input.js';
import { LED_BLINK_GPIO_PORT } from './gpio-led-blink.js';

describe('GPIO Input port', () => {
  it('uses BCM 5 as the circuit pin', () => {
    expect(GPIO_INPUT_PORT).toBe(5);
  });

  it('is included in CHIRIMEN polyfill GPIO ports', () => {
    expect(CHIRIMEN_GPIO_PORTS).toContain(GPIO_INPUT_PORT);
  });

  it('does not reuse the LED Blink output pin', () => {
    expect(GPIO_INPUT_PORT).not.toBe(LED_BLINK_GPIO_PORT);
  });
});

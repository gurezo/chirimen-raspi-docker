import { shouldStopGpioInputOnRoute } from './gpio-input-cleanup.js';

describe('GPIO Input cleanup policy', () => {
  it('stops when leaving GPIO Input', () => {
    expect(shouldStopGpioInputOnRoute('gpio-input')).toBe(false);
    expect(shouldStopGpioInputOnRoute('home')).toBe(true);
    expect(shouldStopGpioInputOnRoute('gpio-output')).toBe(true);
    expect(shouldStopGpioInputOnRoute('i2c-scan')).toBe(true);
  });
});

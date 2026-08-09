import {
  BROWSER_POLYFILL_PACKAGE_NAME,
  BROWSER_POLYFILL_PROTOCOL_PACKAGE,
} from './browser-polyfill.js';

describe('browser-polyfill', () => {
  it('exposes the package identity', () => {
    expect(BROWSER_POLYFILL_PACKAGE_NAME).toBe('browser-polyfill');
  });

  it('depends on protocol as the communication contract', () => {
    expect(BROWSER_POLYFILL_PROTOCOL_PACKAGE).toBe('protocol');
  });
});

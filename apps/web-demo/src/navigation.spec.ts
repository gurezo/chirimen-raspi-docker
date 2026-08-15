import {
  DEMO_NAV_ITEMS,
  HOME_HREF,
  getDemoView,
  parseDemoRoute,
} from './navigation.js';

describe('web-demo navigation', () => {
  it('exposes GPIO Output / GPIO Input / I2C Scan nav items', () => {
    expect(DEMO_NAV_ITEMS).toEqual([
      { id: 'gpio-output', href: '#/gpio-output', label: 'GPIO Output' },
      { id: 'gpio-input', href: '#/gpio-input', label: 'GPIO Input' },
      { id: 'i2c-scan', href: '#/i2c-scan', label: 'I2C Scan' },
    ]);
  });

  it('parses known hashes and falls back to home for unknown hashes', () => {
    expect(parseDemoRoute('')).toBe('home');
    expect(parseDemoRoute('#')).toBe('home');
    expect(parseDemoRoute(HOME_HREF)).toBe('home');
    expect(parseDemoRoute('#/gpio-output')).toBe('gpio-output');
    expect(parseDemoRoute('#/gpio-input')).toBe('gpio-input');
    expect(parseDemoRoute('#/i2c-scan')).toBe('i2c-scan');
    expect(parseDemoRoute('#/unknown')).toBe('home');
    expect(parseDemoRoute('#/gpio-output/extra')).toBe('home');
  });

  it('returns placeholder titles and follow-up issue descriptions', () => {
    expect(getDemoView('home')).toEqual({
      id: 'home',
      title: '',
      description:
        'GPIO Output / GPIO Input / I2C Scan から demo を選んでください。実 example は #50 / #51 / #52 で実装します。',
      showHomeLink: false,
    });
    expect(getDemoView('gpio-output')).toEqual({
      id: 'gpio-output',
      title: 'GPIO Output',
      description:
        'GPIO26 を Start / Stop で点滅させる。回路仕様は docs/examples/gpio-led-blink.md。',
      showHomeLink: true,
    });
    expect(getDemoView('gpio-input')).toEqual({
      id: 'gpio-input',
      title: 'GPIO Input',
      description: 'GPIO Input example（#51）を後続で実装する。',
      showHomeLink: true,
    });
    expect(getDemoView('i2c-scan')).toEqual({
      id: 'i2c-scan',
      title: 'I2C Scan',
      description: 'I2C Scan example（#52）を後続で実装する。',
      showHomeLink: true,
    });
  });
});

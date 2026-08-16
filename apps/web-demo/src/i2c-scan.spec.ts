import { CHIRIMEN_I2C_PORTS } from 'browser-polyfill';
import {
  I2C_SCAN_ADDRESS_MAX,
  I2C_SCAN_ADDRESS_MIN,
  I2C_SCAN_PORT,
  formatI2cSlaveAddress,
} from './i2c-scan.js';

describe('I2C Scan port and address range', () => {
  it('uses CHIRIMEN I2C bus 1', () => {
    expect(I2C_SCAN_PORT).toBe(1);
    expect(CHIRIMEN_I2C_PORTS).toContain(I2C_SCAN_PORT);
  });

  it('scans 0x03 through 0x77 inclusive', () => {
    expect(I2C_SCAN_ADDRESS_MIN).toBe(0x03);
    expect(I2C_SCAN_ADDRESS_MAX).toBe(0x77);
  });
});

describe('formatI2cSlaveAddress', () => {
  it('formats addresses as two-digit hex', () => {
    expect(formatI2cSlaveAddress(0x03)).toBe('0x03');
    expect(formatI2cSlaveAddress(0x48)).toBe('0x48');
    expect(formatI2cSlaveAddress(0x77)).toBe('0x77');
  });
});

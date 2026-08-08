/**
 * I2C domain public API.
 * Node / Browser 固有の実装詳細は含めない。
 */
export type { I2CPortNumber } from './lib/i2c-port-number.js';
export { isI2CPortNumber } from './lib/i2c-port-number.js';
export type { I2CSlaveAddress } from './lib/i2c-slave-address.js';
export { isI2CSlaveAddress } from './lib/i2c-slave-address.js';
export type { I2CRegisterNumber } from './lib/i2c-register-number.js';
export { isI2CRegisterNumber } from './lib/i2c-register-number.js';
export type { I2CByte, I2CWord } from './lib/i2c-byte.js';
export { isI2CByte, isI2CWord } from './lib/i2c-byte.js';
export type { I2CSlaveDevice } from './lib/i2c-slave-device.js';
export type { I2CPort } from './lib/i2c-port.js';
export type { I2CAccess, I2CPortMap } from './lib/i2c-access.js';

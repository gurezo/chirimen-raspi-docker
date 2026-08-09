import type { I2CPortNumber } from 'i2c';

/**
 * CHIRIMEN / Raspberry Pi で一般的な I2C バス番号。
 * node-runtime の I2C テストも port 1 を前提とする。
 */
export const CHIRIMEN_I2C_PORTS = [1] as const satisfies readonly I2CPortNumber[];

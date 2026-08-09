/** I2C 8-bit 値（octet, 0–255） */
export type I2CByte = number;

/**
 * `value` が有効な {@link I2CByte} かどうか。
 * @param value - 判定対象
 */
export function isI2CByte(value: unknown): value is I2CByte {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xff
  );
}

/** I2C 16-bit 値（0–65535） */
export type I2CWord = number;

/**
 * `value` が有効な {@link I2CWord} かどうか。
 * @param value - 判定対象
 */
export function isI2CWord(value: unknown): value is I2CWord {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffff
  );
}

/** `readBytes` の length（1–127。CHIRIMEN polyfill 上限に合わせる） */
export type I2CBytesLength = number;

/**
 * `value` が有効な {@link I2CBytesLength} かどうか。
 * @param value - 判定対象
 */
export function isI2CBytesLength(value: unknown): value is I2CBytesLength {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 127
  );
}

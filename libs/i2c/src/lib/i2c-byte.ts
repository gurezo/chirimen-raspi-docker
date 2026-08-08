/** I2C 8-bit 値 (octet, 0–255) */
export type I2CByte = number;

/** `value` が有効な I2C byte かどうか */
export function isI2CByte(value: unknown): value is I2CByte {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xff
  );
}

/** I2C 16-bit 値 (0–65535) */
export type I2CWord = number;

/** `value` が有効な I2C word かどうか */
export function isI2CWord(value: unknown): value is I2CWord {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffff
  );
}

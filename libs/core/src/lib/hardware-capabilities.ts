/** GPIO backend の分類結果 */
export type GpioBackendKind = 'sysfs' | 'gpiochip' | 'unavailable';

/** I2C backend の分類結果 */
export type I2cBackendKind = 'i2c-dev' | 'unavailable';

/**
 * Server / Node Runtime 起動時に一度だけ検出する hardware capability。
 * Browser / Protocol / WebSocket は Raspberry Pi model を知らず、この結果を Runtime 側で吸収する。
 */
export interface HardwareCapabilities {
  gpio: {
    backend: GpioBackendKind;
  };
  i2c: {
    backend: I2cBackendKind;
  };
}

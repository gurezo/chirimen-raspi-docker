/**
 * LED Blink example が使う GPIO port（BCM 番号）。
 *
 * 回路仕様の正本は `docs/examples/gpio-led-blink.md`。
 * 40-pin header では物理 pin 37。Blink UI は #106 で実装する。
 */
export const LED_BLINK_GPIO_PORT = 26 as const;

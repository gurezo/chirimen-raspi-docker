/**
 * GPIO Input example が使う GPIO port（BCM 番号）。
 *
 * 回路仕様の正本は `docs/examples/gpio-input.md`。
 * 40-pin header では物理 pin 29。
 * 旧 CHIRIMEN `gc/gpio/button` のタクトスイッチと同じ `ports.get(5)`。
 */
export const GPIO_INPUT_PORT = 5 as const;

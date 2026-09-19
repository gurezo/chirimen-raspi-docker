# Legacy CHIRIMEN Example 移植対象一覧

[Legacy GC Examples](https://www.chirimen.org/chirimen/gc/top/examples/) を基準に、新 Runtime へ段階移植するための候補と metadata の正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#251 Legacy CHIRIMEN Example の移植対象と metadata を整理する](https://github.com/gurezo/chirimen-raspi-docker/issues/251)
- 機械可読の正本: [legacy-inventory.json](./legacy-inventory.json)
- Catalog metadata 設計: [catalog-metadata.md](./catalog-metadata.md)（[#252](https://github.com/gurezo/chirimen-raspi-docker/issues/252)）
- 回路図の再利用と互換性確認: [schematic-compatibility.md](./schematic-compatibility.md)（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）

この文書は **移植候補の整理** が目的である。Catalog UI、実行コードの移植は対象外。`deviceId` と certified-devices の join は [catalog-metadata.md](./catalog-metadata.md) を正本とする。回路図の Pi 3 / 4 / 5 互換性ルールは [schematic-compatibility.md](./schematic-compatibility.md) を正本とする。

## 出典

| 種別 | URL |
| --- | --- |
| Legacy Example 一覧 | https://www.chirimen.org/chirimen/gc/top/examples/ |
| Legacy ソース | https://github.com/chirimen-oh/chirimen/tree/master/gc |

公開ページを基準にし、ソースパスと回路図の有無は `gc/gpio/` / `gc/i2c/` / `gc/contrib/examples/` で確認する。

## フィールド

機械可読の正本は [legacy-inventory.json](./legacy-inventory.json) の `examples[]` である。各エントリは次を持つ。

| フィールド | 内容 |
| --- | --- |
| `id` | kebab-case。Basic は Legacy ディレクトリ名に合わせる |
| `title` | 表示名 |
| `category` | `gpio` / `i2c` / `advanced` / `remote` / `other` |
| `legacyUrl` | 公開デモ URL。ディレクトリが無い場合は一覧ページ |
| `legacySourceUrl` | GitHub のソースディレクトリ。無ければ空 |
| `schematicUrl` | 回路図画像 URL。無ければ空 |
| `device` | 人間可読の部品名。Device 未解決時の表示用。Device 正本ではない |
| `deviceId` | `generated/devices.json` の `devices[].id`。未解決は空 |
| `interface` | `gpio` / `i2c` / `gpio+i2c` / `remote` / `camera` / `web-bluetooth` |
| `portingStatus` | `legacy` または `ported` |
| `verificationStatus` | `unverified` または `verified` |
| `supportedRaspberryPi` | `"3"` / `"4"` / `"5"` の配列。未確認は `[]` |
| `runtimeExamplePath` | 本リポジトリの Runtime Example パス。未移植は空 |
| `notes` | 回路図欠落、Runtime 対象外、既存 workspace への対応など |

`deviceId` が Catalog の join キーである。Device の name / image / driver は本 JSON に複製しない。詳細は [catalog-metadata.md](./catalog-metadata.md)。

## ステータス

親 Issue の Example 状態 `legacy` / `ported` / `verified` は、2 フィールドから導出する。

```text
legacy   = portingStatus が legacy
ported   = portingStatus が ported かつ verificationStatus が unverified
verified = portingStatus が ported かつ verificationStatus が verified
```

`verified` は本リポジトリの Raspberry Pi 3 / 4 / 5 実機検証を指す。Legacy GC 側の動作実績だけでは `verified` にしない。

## 段階移植の波

実装は [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256) の対象。ここでの推奨順だけを固定する。

1. 済: GPIO Blink / GPIO Button / I2C detect
2. 一部済: GPIO PIR Sensor（残り Basic GPIO は未移植）
3. 一部済: I2C SHT30 / ADT7410（他の回路図あり Basic I2C は未移植）
4. 一部済: I2C ADS1115（他の Advanced は未移植）
5. Remote / Camera / micro:bit（本 Runtime 対象外の可能性が高い）

Remote は `relayServer.js`、micro:bit は WebBluetooth、Camera は CSI / `getUserMedia` に依存する。

## 一覧

GPIO / I2C を優先して記録し、Advanced / Remote / other も落とさない。個別 metadata は [legacy-inventory.json](./legacy-inventory.json) を正本とする。

収録数は 62 件（gpio 6 / i2c 15 / advanced 33 / remote 6 / other 2）。`ported` + `verified` は 3 件。`ported` + `unverified`（#256 Phase 2）は 4 件。

`catalogStatus` は `portingStatus` と `verificationStatus` から導出する。

## 本リポジトリの Runtime Example

既存の GPIO LED Blink / GPIO Input / I2C Scan を同じ metadata に統合する。I2C Scan は Legacy `i2c-detect` 相当であり、`i2c-adt7410` の温度読み取りとは別である。#256 Phase 2 で PIR / SHT30 / ADT7410 / ADS1115 を `ported` / `unverified` にした。実機 `verified` は [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)。

| id | workspace | 回路 / 検証仕様 | catalogStatus | 根拠 |
| --- | --- | --- | --- | --- |
| `gpio-blink` | [workspace/led-blink/](../../workspace/led-blink/) | [gpio-led-blink.md](./gpio-led-blink.md) | verified | [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) |
| `gpio-button` | [workspace/button/](../../workspace/button/) | [gpio-input.md](./gpio-input.md) | verified | [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) |
| `i2c-detect` | [workspace/i2c-scan/](../../workspace/i2c-scan/) | [i2c-scan.md](./i2c-scan.md) | verified | [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) |
| `gpio-pir-sensor` | [workspace/pir-sensor/](../../workspace/pir-sensor/) | [gpio-pir-sensor.md](./gpio-pir-sensor.md) | ported | [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)（机上確認済み。実機は #257） |
| `i2c-sht30` | [workspace/sht30/](../../workspace/sht30/) | [i2c-sht30.md](./i2c-sht30.md) | ported | [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)（机上確認済み。実機は #257） |
| `i2c-adt7410` | [workspace/adt7410/](../../workspace/adt7410/) | [i2c-adt7410.md](./i2c-adt7410.md) | ported | [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)（机上確認済み。実機は #257） |
| `i2c-ads1115` | [workspace/ads1115/](../../workspace/ads1115/) | [i2c-ads1115.md](./i2c-ads1115.md) | ported | [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)（机上確認済み。実機は #257） |

### Basic GPIO

| id | title | device | schematic | catalogStatus |
| --- | --- | --- | --- | --- |
| `gpio-blink` | GPIO-Blink | LED | あり | verified |
| `gpio-button` | GPIO-Button | tactile-switch | あり | verified |
| `gpio-read-gpio-value` | GPIO-readGpioValue | tactile-switch | あり | legacy |
| `gpio-pir-sensor` | GPIO-pirSensor | KP-IR412 | あり | ported |
| `gpio-multi-blink-all` | GPIO-MultiBlinkAll | LED | なし | legacy |
| `gpio-button-all` | GPIO-buttonAll | tactile-switch | あり（`buttonAll.png`） | legacy |

### Basic I2C

| id | title | device | schematic | catalogStatus |
| --- | --- | --- | --- | --- |
| `i2c-detect` | I2C-detect | （なし。scan のみ） | なし | verified |
| `i2c-sht30` | I2C-SHT30 | SHT30 | あり | ported |
| `i2c-adt7410` | I2C-ADT7410 | ADT7410 | あり | ported |
| `i2c-grove-accelerometer` | I2C-Grove-Accelerometer | ADXL345 | あり | legacy |
| `i2c-grove-gesture` | I2C-Grove-Gesture | PAJ7620U2 | あり | legacy |
| `i2c-grove-light` | I2C-Grove-Light | TSL2561 | あり | legacy |
| `i2c-grove-oled-display` | I2C-Grove-OledDisplay | SSD1308 | あり | legacy |
| `i2c-grove-touch` | I2C-Grove-Touch | MPR121 | あり | legacy |
| `i2c-pca9685` | I2C-PCA9685 | PCA9685 | あり | legacy |
| `i2c-ads1015` | I2C-ADS1015 | ADS1015 | あり | legacy |
| `i2c-gp2y0e03` | I2C-GP2Y0E03 | GP2Y0E03 | あり | legacy |
| `i2c-s11059` | I2C-S11059 | S11059 | あり | legacy |
| `i2c-veml6070` | I2C-VEML6070 | VEML6070 | あり | legacy |
| `i2c-vl53l0x` | I2C-VL53L0X | VL53L0X | あり | legacy |
| `i2c-multi-sensors` | I2C-multi-sensors | ADT7410 | あり | legacy |

### Advanced GPIO / I2C

公開ページの Advanced Examples と、`gc/contrib/examples/` の派生ディレクトリを含む。

| id | title | interface | schematic | notes |
| --- | --- | --- | --- | --- |
| `i2c-ads1115` | I2C-ADS1115 | i2c | あり | 16bit ADC。#256 で ported / unverified |
| `i2c-ads1115-load-cell` | I2C-ADS1115-LoadCell | i2c | あり | ソースは `i2c-ADS1115` |
| `i2c-arduino-stepping-motor` | I2C-arduino-steppingMotor | i2c | あり | Arduino 経由 |
| `i2c-bme280` | I2C-BME280 | i2c | あり | |
| `i2c-bmp180` | I2C-BMP180 | i2c | あり | BMP280 とは別 |
| `i2c-bmp280` | I2C-BMP280 | i2c | あり | BMP180 とは別 |
| `i2c-canzasi-blink` | I2C-canzasi-blink | i2c | あり | 自作ボード |
| `i2c-mpu6050` | I2C-MPU6050 | i2c | あり | |
| `i2c-mpu9250` | I2C-MPU9250 | i2c | あり | |
| `gpio-hbridge` | GPIO-HBridge | gpio | あり | 外部モータ電源 |
| `gpio-i2c-pwm-hbridge-1` | GPIO-I2C-PWMHBridge その１ | gpio+i2c | あり | |
| `gpio-i2c-pwm-hbridge-2` | GPIO-I2C-PWMHBridge その２ | gpio+i2c | あり | |
| `i2c-neopixel-i2c` | I2C-NEOPIXEL_I2C | i2c | あり | ATTINY85 要ファームウェア |
| `i2c-pcf8591` | I2C-PCF8591 | i2c | あり | |
| `i2c-amg8833` | I2C-AMG8833 | i2c | あり | |
| `i2c-bh1750` | I2C-BH1750 | i2c | あり | |
| `i2c-tcs34725` | I2C-TCS34725 | i2c | あり | |
| `i2c-vl53l1x` | I2C-VL53L1X | i2c | あり | |
| `i2c-ina219` | I2C-INA219 | i2c | あり | |
| `i2c-mlx90614` | I2C-MLX90614 | i2c | あり | |
| `i2c-apds9960` | I2C-APDS9960 | i2c | あり | |
| `i2c-seesaw` | I2C-seesaw | i2c | あり | |
| `i2c-seesaw-npix` | I2C-seesawNpix | i2c | あり | ソースは `i2c-seesaw` |
| `i2c-ccs811` | I2C-CCS811 | i2c | なし | ソースディレクトリ無し。baudrate 変更が必要 |
| `i2c-bme680` | I2C-BME680 | i2c | なし | ソースディレクトリ無し |
| `gpio-a4988` | GPIO-A4988 | gpio | あり | ステッピングモータ |
| `i2c-htu21d` | I2C-HTU21D | i2c | あり | |
| `i2c-scd40` | I2C-SCD40 | i2c | あり | |
| `i2c-ht16k33` | I2C-HT16K33 | i2c | あり | 派生 Example あり |
| `i2c-ht16k33-led-7seg` | I2C-HT16K33 7seg | i2c | あり | contrib 派生 |
| `i2c-ht16k33-led-14seg` | I2C-HT16K33 14seg | i2c | あり | contrib 派生 |
| `i2c-ht16k33-led-16x8` | I2C-HT16K33 16x8 | i2c | あり | contrib 派生 |
| `i2c-ht16k33-led-8x8aitendo` | I2C-HT16K33 8x8 aitendo | i2c | あり | contrib 派生 |

### Remote / other（本 Runtime 対象外の可能性が高い）

| id | title | interface | 対象外の理由 |
| --- | --- | --- | --- |
| `remote-gpio-led` | REMOTE-LED | remote | `relayServer.js` |
| `remote-gpio-hbridge` | REMOTE-HBridge | remote | `relayServer.js` |
| `remote-gpio-sw` | REMOTE-SW | remote | `relayServer.js` |
| `remote-i2c-sht30` | REMOTE-I2C-SHT30 | remote | `relayServer.js` |
| `remote-i2c-pca9685` | REMOTE-I2C-PCA9685 | remote | `relayServer.js` |
| `remote-others-camera` | REMOTE-OTHERS-CAMERA | remote | `relayServer.js` と CSI カメラ |
| `others-camera` | Raspberry Pi Camera | camera | CSI / `getUserMedia` |
| `chirimen-micro-bit` | CHIRIMEN with micro:bit | web-bluetooth | WebBluetooth |

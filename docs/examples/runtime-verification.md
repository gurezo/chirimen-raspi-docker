# Example Catalog / Runtime Example の実機検証

Catalog の互換性表示と `verified` を、机上確認ではなく本 Runtime の Raspberry Pi 3 B+ / 4 / 5 実機結果に基づかせるための正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#257 Example Catalog と Runtime Example を Raspberry Pi 3/4/5 実機で検証する](https://github.com/gurezo/chirimen-raspi-docker/issues/257)
- 机上確認: [schematic-compatibility.md](./schematic-compatibility.md)（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）
- 機械可読の正本: [legacy-inventory.json](./legacy-inventory.json)
- Runtime 能力: [Compatibility](../architecture/compatibility.md)（[#97](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#98](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99)）
- 出典と責務: [catalog.md](./catalog.md)（[#258](https://github.com/gurezo/chirimen-raspi-docker/issues/258)）

この文書は **Catalog / Runtime Example の機種別実機記録** が目的である。Runtime の GPIO / I2C backend 自体の記録は Compatibility を上書きしない。62 件すべての実機検証は対象外。`Supported` とは書かない。

## 責務分離

机上確認と実機確認は別層である。

| 層 | metadata | 正本 |
| --- | --- | --- |
| ピン互換の机上確認 | `supportedRaspberryPi` | [schematic-compatibility.md](./schematic-compatibility.md) |
| 機種別の実機結果 | `verificationByModel` | 本文書 |
| Catalog 全体バッジ | `verificationStatus`（集約） | `portingStatus` が `ported` かつ Pi 3 **かつ** 4 **かつ** 5 が `verified` のときだけ `verified` |

`ported` と `verified` は分離する。机上合格（`supportedRaspberryPi` が空でない）だけでは `Verified` にしない。1 機種でも `unverified` / `failed` なら集約は `unverified` であり、Catalog の全体バッジは `ported` のままにする。未確認環境を `Verified` と表示しない。

## 対象環境

| 項目 | 値 |
| --- | --- |
| Raspberry Pi | 3 B+ / 4 / 5 |
| OS | Raspberry Pi OS 64-bit Desktop（Lite も可） |
| Architecture | `aarch64` |
| Catalog | `http://127.0.0.1:4200/` |
| Runtime Example | `http://127.0.0.1:4173/` |
| Runtime | `chirimen-server` `:33330` |

対象環境は推奨要件である。機種別結果の OS / Kernel / Architecture は実測記録であり、推奨名へ書き換えない。

32-bit OS は Unsupported。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md) を参照する（現行の検証手順ではない）。

## 対象 Example

| id | workspace | 回路 | Device / schematic |
| --- | --- | --- | --- |
| `gpio-blink` | [workspace/led-blink/](../../workspace/led-blink/) | [gpio-led-blink.md](./gpio-led-blink.md) | LED。BCM 26 / 物理 pin 37。[回路図](https://www.chirimen.org/chirimen/gc/gpio/LEDblink/schematic.png) |
| `gpio-button` | [workspace/button/](../../workspace/button/) | [gpio-input.md](./gpio-input.md) | tactile-switch。BCM 5 / 物理 pin 29。[回路図](https://www.chirimen.org/chirimen/gc/gpio/button/schematic.png) |
| `i2c-detect` | [workspace/i2c-scan/](../../workspace/i2c-scan/) | [i2c-scan.md](./i2c-scan.md) | Device なし。ADT7410 / `0x48` を scan 対象にする。回路図なし |
| `gpio-pir-sensor` | [workspace/pir-sensor/](../../workspace/pir-sensor/) | [gpio-pir-sensor.md](./gpio-pir-sensor.md) | KP-IR412。BCM 12 / 物理 pin 32。[回路図](https://www.chirimen.org/chirimen/gc/gpio/pirSensor/schematic.png) |
| `i2c-sht30` | [workspace/sht30/](../../workspace/sht30/) | [i2c-sht30.md](./i2c-sht30.md) | SHT30。I2C1 / `0x44`。[回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-SHT30/schematic.png) |
| `i2c-adt7410` | [workspace/adt7410/](../../workspace/adt7410/) | [i2c-adt7410.md](./i2c-adt7410.md) | ADT7410。I2C1 / `0x48`。[回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-ADT7410/schematic.png) |
| `i2c-ads1115` | [workspace/ads1115/](../../workspace/ads1115/) | [i2c-ads1115.md](./i2c-ads1115.md) | ADS1115。I2C1 / `0x48`。[回路図](https://www.chirimen.org/chirimen/gc/contrib/examples/i2c-ADS1115/schematic.png) |

残りの Example は `legacy` のため本 Issue の実機対象外。`verificationByModel` はすべて `unverified`。

## 記録項目

各 Pi × 各 Example で次を残す。

```text
Raspberry Pi model
OS / Kernel / Architecture
Example / Device / schematic
Browser / Browser Polyfill / Runtime
GPIO / I2C result
verified / failed
notes
```

`verificationByModel` の値は `unverified` / `verified` / `failed`。推測で `verified` にしない。

## 手順

各 Pi で同じ順。ADT7410 と ADS1115 はどちらも I2C `0x48` のため **同時接続しない**。

```sh
./scripts/doctor.sh
./scripts/start.sh            # Pi 4 / Pi 5。Pi 3 B+ は --no-build
curl http://127.0.0.1:33330/health
```

1. Catalog `http://127.0.0.1:4200/` を開き、対象カードの全体バッジと機種チップが inventory と一致するか見る
2. 回路図どおり配線する。40-pin / BCM / I2C1（SDA 物理 pin 3 / SCL 物理 pin 5）/ 3.3V を確認する。GPIO へ 5V を入れない
3. Runtime Example（`:4173`）をブラウザで開く
4. 合格条件を確認し、`verified` または `failed` を記録する

推奨順（ピン衝突回避）: Blink → Button → PIR → I2C Scan + ADT7410 → SHT30 → ADT7410 を外して ADS1115。

Browser は Pi 上の Chromium、または LAN のデスクトップブラウザ。Polyfill は各 Example が読み込む本リポジトリの bundle。Runtime は `chirimen-server` `:33330`。

## 合格条件

| id | 合格 |
| --- | --- |
| `gpio-blink` | BCM 26 の LED が点滅する |
| `gpio-button` | BCM 5 のスイッチで値が変わる |
| `gpio-pir-sensor` | BCM 12 で人感 ON / OFF |
| `i2c-detect` | Scan に ADT7410 の `0x48` が出る |
| `i2c-adt7410` | 気温（℃）が更新される |
| `i2c-sht30` | 温度と湿度が更新される（address `0x44`） |
| `i2c-ads1115` | ch0–ch3 の raw / 電圧が更新される（デバイス応答。未配線チャネルは不定で可） |

Catalog 側:

- 未確認モデルに `verified` チップを出さない
- 集約 `verified` は 3 / 4 / 5 がすべて `verified` のときだけ
- 「ピン互換」は机上結果であり `Verified` とは書かない

## 機種別結果

Runtime 能力（sysfs / i2c-dev / Protocol E2E）は [Compatibility](../architecture/compatibility.md) を上書きしない。ここは Catalog / Runtime Example の機別記録である。OS 列は当時の実測表記を保持する。

回路図互換（40-pin header、BCM 番号、I2C1 の SDA 物理 pin 3 / SCL 物理 pin 5、センサ電源 3.3V、GPIO へ 5V を入れない）は 3 モデルで共通であり、各回路仕様の机上確認と一致する。

### Raspberry Pi 3 B+

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 3 Model B+ |
| OS / Kernel / Architecture | Raspbian OS 64-bit / `6.18.34+rpt-rpi-v8` / `aarch64` |
| Browser / Browser Polyfill / Runtime | Chromium または LAN ブラウザ。本リポジトリの polyfill bundle。`chirimen-server` `:33330`。`gpio=sysfs` / `i2c=i2c-dev` |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / [回路図](https://www.chirimen.org/chirimen/gc/gpio/LEDblink/schematic.png) | BCM 26 / 物理 pin 37。`gpio.export`（port `26` / `out`）成功。LED 点滅 | verified | [#97](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)。Runtime Example `workspace/led-blink/` |
| `gpio-button` | tactile-switch / [回路図](https://www.chirimen.org/chirimen/gc/gpio/button/schematic.png) | BCM 5 / 物理 pin 29。sysfs GPIO input。外部 10kΩ プルアップ | verified | #97 の GPIO sysfs と #243 の GPIO Input 回路。Runtime Example `workspace/button/` |
| `i2c-detect` | ADT7410 `0x48` / 回路図なし | I2C1。Scan に `0x48` | verified | [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / #243 / #97。`host /dev/i2c-1` は有効化後。Runtime Example `workspace/i2c-scan/` |
| `gpio-pir-sensor` | KP-IR412 / [回路図](https://www.chirimen.org/chirimen/gc/gpio/pirSensor/schematic.png) | — | unverified | #256 で移植。実機未実施 |
| `i2c-sht30` | SHT30 `0x44` / [回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-SHT30/schematic.png) | — | unverified | 同上 |
| `i2c-adt7410` | ADT7410 `0x48` / [回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-ADT7410/schematic.png) | — | unverified | 同上。Scan とは別 Example |
| `i2c-ads1115` | ADS1115 `0x48` / [回路図](https://www.chirimen.org/chirimen/gc/contrib/examples/i2c-ADS1115/schematic.png) | — | unverified | ADT7410 と同時接続しない |

### Raspberry Pi 4

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 4 Model B Rev 1.4 |
| OS / Kernel / Architecture | Raspbian OS 64-bit / `6.18.34+rpt-rpi-v8` / `aarch64` |
| Browser / Browser Polyfill / Runtime | Chromium または LAN ブラウザ。本リポジトリの polyfill bundle。`chirimen-server` `:33330`。doctor All checks passed。`gpio=sysfs` / `i2c=i2c-dev` |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / 回路図あり | BCM 26 / 物理 pin 37。`gpio.export`（port `26` / `out`）成功。LED 点滅 | verified | [#98](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / #243。Runtime Example `workspace/led-blink/` |
| `gpio-button` | tactile-switch / 回路図あり | BCM 5 / 物理 pin 29。sysfs GPIO input。外部 10kΩ プルアップ | verified | #98 の GPIO sysfs と #243 の GPIO Input 回路。Runtime Example `workspace/button/` |
| `i2c-detect` | ADT7410 `0x48` | I2C1。Scan に `0x48` | verified | #116 / #243 / #98。`host /dev/i2c-1` は有効化後。Runtime Example `workspace/i2c-scan/` |
| `gpio-pir-sensor` | KP-IR412 | — | unverified | #256 で移植。実機未実施 |
| `i2c-sht30` | SHT30 `0x44` | — | unverified | 同上 |
| `i2c-adt7410` | ADT7410 `0x48` | — | unverified | 同上 |
| `i2c-ads1115` | ADS1115 `0x48` | — | unverified | ADT7410 と同時接続しない |

### Raspberry Pi 5

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 5 Model B Rev 1.0 |
| OS / Kernel / Architecture | Raspbian OS 64-bit / `6.18.34+rpt-rpi-2712` / `aarch64` |
| Browser / Browser Polyfill / Runtime | Chromium または LAN ブラウザ。本リポジトリの polyfill bundle。`chirimen-server` `:33330`。doctor All checks passed。`gpio=sysfs` / `i2c=i2c-dev`。Browser Development Flow の一次環境（#243） |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / 回路図あり | BCM 26 / 物理 pin 37。export / write 成功。LED 点滅 | verified | [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / #243。Catalog `:4200` と Runtime Example `:4173/led-blink/` |
| `gpio-button` | tactile-switch / 回路図あり | BCM 5 / 物理 pin 29。read / onchange。外部 10kΩ プルアップ | verified | #99 の GPIO input と #243。Runtime Example `:4173/button/` |
| `i2c-detect` | ADT7410 `0x48` | I2C1。Browser Scan に `0x48` | verified | #116 / #243 / #99。Runtime Example `:4173/i2c-scan/` |
| `gpio-pir-sensor` | KP-IR412 | — | unverified | #256 で移植。実機未実施 |
| `i2c-sht30` | SHT30 `0x44` | — | unverified | 同上 |
| `i2c-adt7410` | ADT7410 `0x48` | — | unverified | 同上 |
| `i2c-ads1115` | ADS1115 `0x48` | — | unverified | ADT7410 と同時接続しない |

Catalog 表示（`http://127.0.0.1:4200/`。Pi 上または SSH port forward 先）: `gpio-blink` / `gpio-button` / `i2c-detect` は全体バッジ `verified` と `Pi 3 verified` / `Pi 4 verified` / `Pi 5 verified`。Phase 2 の 4 件は全体バッジ `ported` と `unverified` チップであり、未確認環境を `Verified` と出さない。

### Phase 2（PIR / SHT30 / ADT7410 / ADS1115）

#256 で `ported` にした 4 件は、机上確認で `supportedRaspberryPi` が `["3","4","5"]` である。本 Issue では Pi 3 B+ / 4 / 5 を実機対象としたが、GPIO / I2C 実機へ到達できなかったため **3 モデルとも `unverified` のまま** にする。推測で `verified` にしない。

| 確認 | 結果 |
| --- | --- |
| 机上（40-pin / BCM / I2C1 / 3.3V） | 合格。各回路仕様を参照 |
| Catalog 表示 | 全体バッジ `ported`。機種チップは `Pi 3 unverified` / `Pi 4 unverified` / `Pi 5 unverified` |
| GPIO PIR（BCM 12） | 未実施 |
| SHT30（I2C1 / `0x44`） | 未実施 |
| ADT7410 温度（I2C1 / `0x48`） | 未実施。`i2c-detect` の Scan とは別 |
| ADS1115（I2C1 / `0x48`） | 未実施。ADT7410 と同時接続しない |

実機合格後にだけ `verificationByModel` を `verified` へ更新する。1 機種でも未確認なら集約 `verificationStatus` は `unverified` のままである。

## catalogStatus の導出

```text
legacy   = portingStatus が legacy
ported   = portingStatus が ported かつ verificationByModel の 3/4/5 がすべて verified ではない
verified = portingStatus が ported かつ verificationByModel の 3 かつ 4 かつ 5 が verified
```

JSON の `verificationStatus` は集約値として残す。Catalog は `verificationByModel` を優先し、未確認モデルを `Verified` にしない。

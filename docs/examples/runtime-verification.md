# Example Catalog / Runtime Example の実機検証

Catalog の互換性表示と `verified` を、机上確認ではなく本 Runtime の Raspberry Pi 3 B+ / 4 / 5 実機結果に基づかせるための正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#257 Example Catalog と Runtime Example を Raspberry Pi 3/4/5 実機で検証する](https://github.com/gurezo/chirimen-raspi-docker/issues/257)
- 机上確認: [schematic-compatibility.md](./schematic-compatibility.md)（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）
- 機械可読の正本: [legacy-inventory.json](./legacy-inventory.json)
- Runtime 能力: [Compatibility](../architecture/compatibility.md)（[#97](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#98](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99)）

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
| OS | Raspberry Pi OS Lite 64-bit |
| Architecture | `aarch64` |
| Catalog | `http://127.0.0.1:4174/` |
| Runtime Example | `http://127.0.0.1:4173/` |
| Runtime | `chirimen-server` `:33330` |

32-bit OS は対象外。[32-bit Compatibility](../architecture/compatibility-32bit.md) を参照する。

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
./scripts/start.sh
curl http://localhost:33330/health
```

1. Catalog `http://127.0.0.1:4174/` を開き、対象カードの全体バッジと機種チップが inventory と一致するか見る
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

詳細は後続の実機記録で埋める。ここでの初期値は inventory の現状（#243 集約の 3 件と、#256 Phase 2 の未確認 4 件）である。

### Raspberry Pi 3 B+

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | （実測後に記入） |
| OS / Kernel / Architecture | Raspberry Pi OS Lite 64-bit / （kernel） / `aarch64` |
| Browser / Browser Polyfill / Runtime | （実測後に記入） |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / [回路図](https://www.chirimen.org/chirimen/gc/gpio/LEDblink/schematic.png) | （実測後に記入） | verified | 当面は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) / [#97](https://github.com/gurezo/chirimen-raspi-docker/issues/97) の集約。機別詳細は後続 |
| `gpio-button` | tactile-switch / [回路図](https://www.chirimen.org/chirimen/gc/gpio/button/schematic.png) | （実測後に記入） | verified | 同上 |
| `i2c-detect` | ADT7410 `0x48` / 回路図なし | （実測後に記入） | verified | [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / #243 / #97 |
| `gpio-pir-sensor` | KP-IR412 / [回路図](https://www.chirimen.org/chirimen/gc/gpio/pirSensor/schematic.png) | — | unverified | #256 で移植。実機未実施 |
| `i2c-sht30` | SHT30 `0x44` / [回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-SHT30/schematic.png) | — | unverified | 同上 |
| `i2c-adt7410` | ADT7410 `0x48` / [回路図](https://www.chirimen.org/chirimen/gc/i2c/i2c-ADT7410/schematic.png) | — | unverified | 同上。Scan とは別 Example |
| `i2c-ads1115` | ADS1115 `0x48` / [回路図](https://www.chirimen.org/chirimen/gc/contrib/examples/i2c-ADS1115/schematic.png) | — | unverified | ADT7410 と同時接続しない |

### Raspberry Pi 4

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | （実測後に記入） |
| OS / Kernel / Architecture | Raspberry Pi OS Lite 64-bit / （kernel） / `aarch64` |
| Browser / Browser Polyfill / Runtime | （実測後に記入） |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / 回路図あり | （実測後に記入） | verified | #243 / [#98](https://github.com/gurezo/chirimen-raspi-docker/issues/98) |
| `gpio-button` | tactile-switch / 回路図あり | （実測後に記入） | verified | 同上 |
| `i2c-detect` | ADT7410 `0x48` | （実測後に記入） | verified | #116 / #243 / #98 |
| `gpio-pir-sensor` | KP-IR412 | — | unverified | |
| `i2c-sht30` | SHT30 `0x44` | — | unverified | |
| `i2c-adt7410` | ADT7410 `0x48` | — | unverified | |
| `i2c-ads1115` | ADS1115 `0x48` | — | unverified | |

### Raspberry Pi 5

| 項目 | 値 |
| --- | --- |
| Raspberry Pi model | （実測後に記入） |
| OS / Kernel / Architecture | Raspberry Pi OS Lite 64-bit / （kernel） / `aarch64` |
| Browser / Browser Polyfill / Runtime | （実測後に記入） |

| Example | Device / schematic | GPIO / I2C result | status | notes |
| --- | --- | --- | --- | --- |
| `gpio-blink` | LED / 回路図あり | （実測後に記入） | verified | #243 / [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) |
| `gpio-button` | tactile-switch / 回路図あり | （実測後に記入） | verified | 同上 |
| `i2c-detect` | ADT7410 `0x48` | （実測後に記入） | verified | #116 / #243 / #99 |
| `gpio-pir-sensor` | KP-IR412 | — | unverified | |
| `i2c-sht30` | SHT30 `0x44` | — | unverified | |
| `i2c-adt7410` | ADT7410 `0x48` | — | unverified | |
| `i2c-ads1115` | ADS1115 `0x48` | — | unverified | |

## catalogStatus の導出

```text
legacy   = portingStatus が legacy
ported   = portingStatus が ported かつ verificationByModel の 3/4/5 がすべて verified ではない
verified = portingStatus が ported かつ verificationByModel の 3 かつ 4 かつ 5 が verified
```

JSON の `verificationStatus` は集約値として残す。Catalog は `verificationByModel` を優先し、未確認モデルを `Verified` にしない。

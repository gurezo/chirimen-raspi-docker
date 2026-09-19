# Example Catalog metadata と chirimen-certified-devices 連携

Example Catalog が参照する metadata の責務を、Example 固有情報と Device 固有情報に分離する設計の正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#252 Example Catalog metadata と chirimen-certified-devices 連携を設計する](https://github.com/gurezo/chirimen-raspi-docker/issues/252)
- 前段: [#251 Legacy CHIRIMEN Example の移植対象と metadata を整理する](https://github.com/gurezo/chirimen-raspi-docker/issues/251)（[legacy-inventory.md](./legacy-inventory.md)）
- 回路図: [schematic-compatibility.md](./schematic-compatibility.md)（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）
- Device 正本: [gurezo/chirimen-certified-devices](https://github.com/gurezo/chirimen-certified-devices) の [`generated/devices.json`](https://github.com/gurezo/chirimen-certified-devices/blob/main/generated/devices.json)

この文書は **Catalog metadata の設計** が目的である。Catalog UI（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）、実行コードの移植（[#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)）は対象外。回路図の再利用と Pi 3 / 4 / 5 互換性確認は [schematic-compatibility.md](./schematic-compatibility.md) を正本とする。

## 責務分離

デバイス情報を本リポジトリで重複管理しない。Catalog は Example 側の `deviceId` で certified-devices を参照する。

```text
chirimen-certified-devices
        │ generated/devices.json
        │ Device metadata
        ↓
legacy-inventory.json ─────→ Example Catalog（#254）
Example metadata             HTML / Vanilla JS
│                            Tailwind CSS はスタイルのみ
├─ title / category
├─ deviceId
├─ legacy URL
├─ schematic URL
├─ runtime example path
├─ porting / verification
└─ supported Raspberry Pi
```

| 責務 | 正本 | Catalog が持つもの |
| --- | --- | --- |
| Example | [legacy-inventory.json](./legacy-inventory.json) | 題材、状態、回路図 URL、Runtime パス |
| Device | `generated/devices.json` | 型番、画像、説明、ドライバ |
| 回路図 | Example の `schematicUrl` | Device の `circuit` は使わない（[schematic-compatibility.md](./schematic-compatibility.md)） |
| 実行コード | Example の `runtimeExamplePath` | Device の upstream Example は使わない |
| Device 一覧 UI | [chirimen-device-dashboard](https://github.com/gurezo/chirimen-device-dashboard) | iframe せず外部リンク |

本リポジトリへ `devices.json` を正本としてコピーしない。

## 参照 URL

Catalog UI（#254）が Device metadata を取得する URL は次とする。

```text
https://raw.githubusercontent.com/gurezo/chirimen-certified-devices/main/generated/devices.json
```

## Example 側 schema

機械可読の正本は [legacy-inventory.json](./legacy-inventory.json) の `examples[]` である。

#251 のフィールドを維持し、Device との join 用フィールドを追加する。

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `id` | はい | kebab-case の Example ID |
| `title` | はい | 表示名 |
| `category` | はい | `gpio` / `i2c` / `advanced` / `remote` / `other` |
| `deviceId` | はい | `generated/devices.json` の `devices[].id`。未解決は空文字 |
| `device` | はい | 人間可読の部品名。Device 未解決時の表示用。Device 正本ではない |
| `legacyUrl` | はい | Legacy GC の公開 URL。無ければ空 |
| `legacySourceUrl` | はい | Legacy ソース URL。無ければ空 |
| `schematicUrl` | はい | 回路図 URL。無ければ空。Device 側回路図は使わない |
| `runtimeExamplePath` | はい | 本リポジトリの Runtime Example パス。未移植は空 |
| `portingStatus` | はい | `legacy` または `ported` |
| `verificationStatus` | はい | `unverified` または `verified` |
| `supportedRaspberryPi` | はい | `"3"` / `"4"` / `"5"` の配列。未確認は `[]` |
| `interface` | はい | `gpio` / `i2c` / `gpio+i2c` / `remote` / `camera` / `web-bluetooth` |
| `notes` | はい | 補足。I2C address が必要な場合もここに置く |

`supportedRaspberryPi` のピン互換の確認方法は [schematic-compatibility.md](./schematic-compatibility.md)。実機検証の記録は [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)。既存の `gpio-blink` / `gpio-button` / `i2c-detect` だけ [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) に基づき `["3","4","5"]` とする。

## Join

```text
device = devices.find((d) => d.id === example.deviceId)
```

`deviceId` が空でも Example は Catalog に残す。GPIO LED Blink や I2C Scan のように Device が無い、または認定デバイスへ一意に対応できない場合を正規ケースとする。

inventory の `device` 文字列は certified-devices の `id` と一致しないことが多い。一意に決まる場合だけ実 ID を入れる。決まらない場合は空にし、`notes` に候補または「認定デバイス未登録」を書く。推測で誤 join しない。

GPIO / I2C 優先分と、空 `deviceId` の正規ケース:

| inventory `id` | `device` | `deviceId` |
| --- | --- | --- |
| `gpio-blink` 等 LED | LED | `led` |
| `gpio-button` 等 | tactile-switch | `2pin` |
| `gpio-pir-sensor` | KP-IR412 | `KP-IR412` |
| `i2c-detect` | （空） | `""`（Device なし） |
| `i2c-sht30` | SHT30 | `sht30-31` |
| `i2c-adt7410` | ADT7410 | `ADT7410` |
| `i2c-grove-accelerometer` | ADXL345 | `grove-accelerometer-adxl345` |
| `i2c-grove-gesture` | PAJ7620U2 | `grove-gesture-paj7620u2` |
| `i2c-grove-light` | TSL2561 | `grove-light-tsl2561` |
| `i2c-grove-oled-display` | SSD1308 | `grove-oleddisplay-ssd1308` |
| `i2c-grove-touch` | MPR121 | `grove-touch-mpr121` |
| `i2c-pca9685` | PCA9685 | `PCA9685_MX1508` |
| `i2c-ht16k33-led-7seg` | HT16K33 | `ht16k33-7-led` |
| `i2c-ht16k33-led-14seg` | HT16K33 | `ht16k33-14-led` |
| `i2c-ht16k33-led-16x8` | HT16K33 | `ht16k33-16x8led` |
| `remote-i2c-pca9685` | PCA9685 | `remote_PCA9685_MX1508` |

空 `deviceId` の例:

- Device なし: `i2c-detect`
- 複合で一意に決まらない: `i2c-multi-sensors`（ADT7410 と `grove-light-tsl2561`）
- 派生が複数: `i2c-ht16k33`、`i2c-ht16k33-led-8x8aitendo`
- 認定デバイス未登録: Arduino、Canzasi、micro:bit、Raspberry Pi Camera

全件の値は [legacy-inventory.json](./legacy-inventory.json) を正本とする。

## generated/devices.json の実 schema

参照する JSON は `version: 1` である。トップレベルは次を持つ。

```text
version
generatedAt
platforms
aliases
devices[]
```

`devices[]` の 1 件は `{ id, directory, meta, readme }` である。`meta` は certified-devices の [schema/meta.schema.json](https://github.com/gurezo/chirimen-certified-devices/blob/main/schema/meta.schema.json) と一致する。

Catalog は Issue が挙げた Device 項目のうち、**実在するフィールドだけ**を使う。存在しない項目は捏造しない。

### Catalog が Device から読む項目

| Catalog での意味 | 実フィールド | 備考 |
| --- | --- | --- |
| 表示名 | `meta.model` | 補助として `readme.frontmatter.title` |
| 型番 | `meta.model` | |
| Device カテゴリ | `meta.category` | Example の `category`（gpio / i2c）とは別 |
| 画像 | `meta.image` | 空や壊れ URL でも Catalog は落とさない |
| 説明 | `meta.description` | |
| ドライバ | `meta.packages[]` と `meta.examples[].driver` | `driver` が `"none"` のときはパッケージ無し |

### Catalog が Device から読まない項目

| 項目 | 理由 |
| --- | --- |
| I2C address | `generated/devices.json` と `meta.schema.json` に無い。必要な値は Example の `notes` か Runtime 検証仕様（例: [i2c-scan.md](./i2c-scan.md) の `0x48`）に置く |
| `meta.circuit` / `examples[].circuitUrl` | 回路図の正本は Example の `schematicUrl`（[schematic-compatibility.md](./schematic-compatibility.md)） |
| `meta.examples[]` の upstream 実行コード | Runtime コードの正本は `runtimeExamplePath` |
| `meta.status` / `meta.verified` / platform の `primary` 等 | Catalog 状態は `portingStatus` / `verificationStatus` から導出する |
| `meta.tag` | 参考情報。Catalog の filter は Example の `category` / `interface` を使う |
| `meta.productUrl` / `datasheet` / `reference` | Catalog 必須ではない。Device Dashboard 側の情報とする |

## Fallback

Catalog UI（#254）は Device 情報の欠落や取得失敗で致命エラーにしない。Example カードは常に [legacy-inventory.json](./legacy-inventory.json) だけで描画できる。

| 状況 | Catalog の振る舞い |
| --- | --- |
| `deviceId` が空 | Device なしとして Example だけ表示する。GPIO LED でも I2C Scan でも成立する。プレースホルダ画像は任意。Device 未登録と誤認させない |
| `deviceId` が `devices[]` に無い | 上と同じ。`device` ラベルだけ出す |
| `devices.json` の取得失敗 | 全 Example を Device なしで描画する。短い警告を出してよい。画面全体を落とさない |
| JSON として読めない / `version` が `1` 以外 | 取得失敗と同じ |
| `image` が空または読み込めない | 画像無し。カードは残す |
| `packages` が空 / `driver` が `"none"` | ドライバ無し。カードは残す |
| `description` が空 | Device 説明を出さない。Example の `title` / `notes` は出す |

取得失敗の例:

- ネットワークエラー
- HTTP 4xx / 5xx
- 空レスポンス
- JSON でないレスポンス
- `devices` 配列が無い

本リポジトリに `devices.json` のスナップショットを正本として置かない。オフライン時も Example metadata だけで Catalog が開くことを優先する。

## Device Dashboard

CHIRIMEN 全体の Device Catalog は [chirimen-device-dashboard](https://github.com/gurezo/chirimen-device-dashboard) への外部リンクとする。iframe で埋め込まない。

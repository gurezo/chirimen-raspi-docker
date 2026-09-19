# Example Catalog metadata と chirimen-certified-devices 連携

Example Catalog が参照する metadata の責務を、Example 固有情報と Device 固有情報に分離する設計の正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#252 Example Catalog metadata と chirimen-certified-devices 連携を設計する](https://github.com/gurezo/chirimen-raspi-docker/issues/252)
- 前段: [#251 Legacy CHIRIMEN Example の移植対象と metadata を整理する](https://github.com/gurezo/chirimen-raspi-docker/issues/251)（[legacy-inventory.md](./legacy-inventory.md)）
- Device 正本: [gurezo/chirimen-certified-devices](https://github.com/gurezo/chirimen-certified-devices) の [`generated/devices.json`](https://github.com/gurezo/chirimen-certified-devices/blob/main/generated/devices.json)

この文書は **Catalog metadata の設計** が目的である。Catalog UI（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）、回路図の Pi 3 / 4 / 5 互換性ルール（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）、実行コードの移植（[#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)）は対象外。

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
| 回路図 | Example の `schematicUrl` | Device の `circuit` は使わない（#253） |
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

`supportedRaspberryPi` のピン互換の確認方法は #253。実機検証の記録は #257。既存の `gpio-blink` / `gpio-button` / `i2c-detect` だけ [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) に基づき `["3","4","5"]` とする。

## Join

```text
device = devices.find((d) => d.id === example.deviceId)
```

`deviceId` が空でも Example は Catalog に残す。GPIO LED Blink や I2C Scan のように Device が無い、または認定デバイスへ一意に対応できない場合を正規ケースとする。

## Device Dashboard

CHIRIMEN 全体の Device Catalog は [chirimen-device-dashboard](https://github.com/gurezo/chirimen-device-dashboard) への外部リンクとする。iframe で埋め込まない。

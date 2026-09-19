# Legacy GC 回路図の再利用と Raspberry Pi 3/4/5 互換性確認

旧 GC 回路図を活用しつつ、Raspberry Pi 3 B+ / 4 / 5 で利用可能なものだけを案内するための再利用方針と互換性確認方法の正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#253 Legacy GC 回路図の再利用ルールと Raspberry Pi 3/4/5 互換性確認方法を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/253)
- 前段: [#251](https://github.com/gurezo/chirimen-raspi-docker/issues/251)（[legacy-inventory.md](./legacy-inventory.md)）/ [#252](https://github.com/gurezo/chirimen-raspi-docker/issues/252)（[catalog-metadata.md](./catalog-metadata.md)）
- 機械可読の正本: [legacy-inventory.json](./legacy-inventory.json)

この文書は **回路図の再利用ルールと互換性確認方法** が目的である。Catalog UI（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）、実機検証の記録（[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）、実行コードの移植（[#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)）は対象外。

## 責務分離

回路図は Device metadata ではなく、Example 側の情報として扱う。Device の画像・型番・ドライバは [catalog-metadata.md](./catalog-metadata.md) の join で読む。

```text
chirimen-certified-devices
        │ generated/devices.json
        │ Device metadata（型番 / 画像 / ドライバ）
        ↓
legacy-inventory.json ─────→ Example Catalog（#254）
Example metadata             schematicUrl を参照
│                            画像はコピーしない
├─ title / category
├─ deviceId
├─ schematicUrl  ← 回路図の正本
├─ porting / verification
└─ supportedRaspberryPi
```

| 責務 | 正本 | Catalog が持つもの |
| --- | --- | --- |
| 回路図 | Example の `schematicUrl` | Legacy GC の公開 URL。Device の `meta.circuit` / `examples[].circuitUrl` は使わない |
| Device | `generated/devices.json` | 型番、画像、説明、ドライバ |
| 実行コード | Example の `runtimeExamplePath` | Device の upstream Example は使わない |
| ピン互換 | `supportedRaspberryPi` | 本文書の机上確認結果 |
| 実機結果 | `verificationStatus` | [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257) の記録 |

本リポジトリへ回路図 PNG を正本としてコピーしない。`devices.json` 側の回路図フィールドも正本にしない。

## 再利用方針

初期実装では Legacy GC の公開 URL を参照する。

```text
https://www.chirimen.org/chirimen/gc/contrib/examples/i2c-ADS1115/schematic.png
```

| 方針 | 内容 |
| --- | --- |
| 参照する | `schematicUrl` に chirimen.org の公開画像 URL を入れる |
| コピーしない | PNG を `docs/` や `workspace/` に置かない |
| ファイル名 | `schematic.png` 以外もあり得る。inventory の URL をそのまま使う |
| 欠落 | 回路図が無い Example は `schematicUrl` を空文字にする。プレースホルダ画像は作らない |

`schematic.png` 以外の例は [legacy-inventory.json](./legacy-inventory.json) にある。`gpio-button-all` は `buttonAll.png`、`i2c-bh1750` は `BH1750schematic.png` など。

## 出典

Catalog / Documentation は `schematicUrl` を出典として残す。表示する場合もリンク先は Legacy GC とする。

| 種別 | URL |
| --- | --- |
| Legacy Example 一覧 | https://www.chirimen.org/chirimen/gc/top/examples/ |
| Legacy ソース | https://github.com/chirimen-oh/chirimen/tree/master/gc |

出典切れ（HTTP 404 など）でも `schematicUrl` は残す。Catalog は画像が読めなくても Example カードを落とさない。

## 互換性確認の 2 層

回路図の案内と Catalog の `Verified` は別である。

| 層 | 目的 | metadata | 実施 Issue |
| --- | --- | --- | --- |
| 机上確認 | 40-pin / BCM / I2C / 電源が Pi 3 B+ / 4 / 5 で共通か見る | `supportedRaspberryPi` | 本 Issue（#253）。移植時（[#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)）に適用する |
| 実機確認 | 本 Runtime で Pi ごとに動くかを記録する | `verificationStatus` | [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257) |

本 Issue は確認方法を定義する。62 件すべての机上確認と実機検証は対象外。既存の `gpio-blink` / `gpio-button` / `i2c-detect` だけ [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) で机上 + 実機済みであり、`supportedRaspberryPi` は `["3","4","5"]`、`verificationStatus` は `verified` のままとする。

### 机上確認（`supportedRaspberryPi`）

Pi 3 B+ / 4 / 5 の 40-pin header は物理ピン配置が共通である。次をすべて満たしたモデルだけ配列に入れる。未確認は `[]`。

| 確認項目 | 合格条件 |
| --- | --- |
| 40-pin header | 配線が 40-pin GPIO header を前提にしている |
| physical pin | 使う物理 pin が 40-pin 上に存在する |
| BCM GPIO | GPIO として使う BCM 番号が Browser Polyfill の `CHIRIMEN_GPIO_PORTS`（`4, 17, 18, 27, 22, 23, 24, 25, 5, 6, 12, 13, 19, 16, 26, 20, 21`）に含まれる |
| I2C SDA / SCL | I2C は I2C1。SDA = 物理 pin 3（BCM 2）、SCL = 物理 pin 5（BCM 3）。`/dev/i2c-1`、`ports.get(1)` |
| 3.3V / 5V | GPIO へ 5V（物理 pin 2 / 4）を入れない。センサ電源は 3.3V（物理 pin 1 / 17）を正とする |
| GND | 40-pin の GND に落ちる |
| Pi 固有特殊機能 | CSI / DSI / Pi 5 PCIe など、40-pin GPIO / I2C1 以外に依存しない |

モータドライバなど外部電源が必要な回路は、GPIO へ 5V を入れない限り机上確認の対象から外さない。外部電源の注意は `notes` に残す。

不合格、または未実施のときは `supportedRaspberryPi` を `[]` のままにし、`notes` に理由を書く。Catalog は「Pi 3/4/5 で利用可能」と案内しない。

参考にする既存仕様:

- GPIO output: [gpio-led-blink.md](./gpio-led-blink.md)（BCM 26 / 物理 pin 37）
- GPIO input: [gpio-input.md](./gpio-input.md)（BCM 5 / 物理 pin 29。Pi 5 は内部プルに依存しない）
- I2C1: [i2c-scan.md](./i2c-scan.md)（SDA 物理 pin 3 / SCL 物理 pin 5）

### 実機確認（`verificationStatus`）

机上確認に合格しても `verified` にはしない。実機確認の記録は [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257) とする。

| 確認項目 | 条件 |
| --- | --- |
| Raspberry Pi 3 B+ | Raspberry Pi OS 64-bit で本 Runtime を動かす |
| Raspberry Pi 4 | 同上 |
| Raspberry Pi 5 | 同上 |

モデルごとに結果が異なる場合は `supportedRaspberryPi` を絞り、`notes` に差を書く。対応環境の Runtime 記録は [Compatibility](../architecture/compatibility.md) を参照する。

### 適用タイミング

```text
移植時（#256）  → 机上確認 → supportedRaspberryPi を更新
実機時（#257）  → Pi 3 B+ / 4 / 5 で確認 → verificationStatus を更新
```

本 Issue ではルール定義のみ行う。

## Catalog の Verified 表示

`catalogStatus` は [legacy-inventory.md](./legacy-inventory.md) と同じ導出とする。

```text
legacy   = portingStatus が legacy
ported   = portingStatus が ported かつ verificationStatus が unverified
verified = portingStatus が ported かつ verificationStatus が verified
```

`supportedRaspberryPi` はピン互換の机上結果、`verificationStatus` は本リポジトリの実機結果である。Catalog UI（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）は次を守る。

| 状況 | Catalog の振る舞い |
| --- | --- |
| `verificationStatus` が `unverified` | `Verified` バッジを出さない。回路図リンクがあっても同様 |
| Legacy GC に回路図があるだけ | `verified` にしない |
| 机上確認合格（`supportedRaspberryPi` が空でない） | ピン互換のモデルだけ案内する。`Verified` バッジは出さない |
| `schematicUrl` が空 | 回路図リンクを出さない |
| `supportedRaspberryPi` が `[]` | モデル互換を断言しない |
| 出典切れで画像が読めない | カードは残す。`schematicUrl` は出典として残す |

`verified` は本リポジトリの Raspberry Pi 3 / 4 / 5 実機検証を指す。Legacy GC 側の動作実績だけでは `verified` にしない。

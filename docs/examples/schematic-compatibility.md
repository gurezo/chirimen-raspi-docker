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

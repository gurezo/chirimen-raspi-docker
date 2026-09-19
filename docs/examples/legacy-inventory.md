# Legacy CHIRIMEN Example 移植対象一覧

[Legacy GC Examples](https://www.chirimen.org/chirimen/gc/top/examples/) を基準に、新 Runtime へ段階移植するための候補と metadata の正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#251 Legacy CHIRIMEN Example の移植対象と metadata を整理する](https://github.com/gurezo/chirimen-raspi-docker/issues/251)
- 機械可読の正本: [legacy-inventory.json](./legacy-inventory.json)
- 次の設計: [#252 Example Catalog metadata と chirimen-certified-devices 連携](https://github.com/gurezo/chirimen-raspi-docker/issues/252)

この文書は **移植候補の整理** が目的である。Catalog UI、`chirimen-certified-devices` の schema 結合、回路図の Pi 3 / 4 / 5 互換性ルール、実行コードの移植は対象外。

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
| `device` | 対応デバイス候補。GPIO LED 等は部品名。未対応は空 |
| `interface` | `gpio` / `i2c` / `gpio+i2c` / `remote` / `camera` / `web-bluetooth` |
| `portingStatus` | `legacy` または `ported` |
| `verificationStatus` | `unverified` または `verified` |
| `runtimeExamplePath` | 本リポジトリの Runtime Example パス。未移植は空 |
| `notes` | 回路図欠落、Runtime 対象外、既存 workspace への対応など |

`device` は Catalog 最終の `deviceId` ではない。Device metadata の責務分離は #252 が設計する。

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
2. 残りの Basic GPIO
3. 回路図ありの Basic I2C センサ
4. Advanced GPIO / I2C
5. Remote / Camera / micro:bit（本 Runtime 対象外の可能性が高い）

Remote は `relayServer.js`、micro:bit は WebBluetooth、Camera は CSI / `getUserMedia` に依存する。

## 一覧

GPIO / I2C を優先して記録する。Advanced / Remote も落とさない。個別 metadata は [legacy-inventory.json](./legacy-inventory.json) を正本とする。

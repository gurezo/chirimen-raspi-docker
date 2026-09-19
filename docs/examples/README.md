# CHIRIMEN Example 回路・検証仕様

GPIO LED Blink / GPIO Input / I2C Scan の回路仕様と検証仕様です。GitHub Pages の Documentation 正本です。

Legacy GC Example の移植候補と状態（`legacy` / `ported` / `verified`）は [legacy-inventory.md](./legacy-inventory.md) を正本とする。機械可読データは [legacy-inventory.json](./legacy-inventory.json)。Example と Device の責務分離は [catalog-metadata.md](./catalog-metadata.md)。回路図の再利用と Pi 3 / 4 / 5 互換性確認は [schematic-compatibility.md](./schematic-compatibility.md)。

HTML サンプルの編集場所は [workspace/](../../workspace/) です。Browser Editor で保存すれば Example Server（`:4173`）で動きます。Example Catalog（`:4174`）は題材の発見 UI です。

| 文書 | 内容 |
| --- | --- |
| [legacy-inventory.md](./legacy-inventory.md) | Legacy Example の移植対象一覧と metadata（#251） |
| [catalog-metadata.md](./catalog-metadata.md) | Example Catalog metadata と chirimen-certified-devices 連携（#252） |
| [schematic-compatibility.md](./schematic-compatibility.md) | Legacy GC 回路図の再利用と Pi 3 / 4 / 5 互換性確認（#253） |
| [gpio-led-blink.md](./gpio-led-blink.md) | GPIO LED Blink 回路仕様（BCM 26 / 物理 pin 37 / LED + 330Ω） |
| [gpio-input.md](./gpio-input.md) | GPIO Input 回路仕様（BCM 5 / 物理 pin 29 / タクトスイッチ + 10kΩ プルアップ） |
| [i2c-scan.md](./i2c-scan.md) | I2C Scan 検証仕様（ADT7410 / `0x48` / I2C1） |

操作手順は各 Guide を正とします。

- [GPIO LED Blink](../guides/gpio-led-blink.md)
- [GPIO Input](../guides/gpio-input.md)
- [I2C Scan](../guides/i2c-scan.md)
- [Browser Development Environment](../guides/browser-development.md)
- 実機 E2E: [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）

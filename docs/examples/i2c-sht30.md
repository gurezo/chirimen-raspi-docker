# I2C SHT30 回路仕様

SHT30 の温度・湿度読み取り回路を固定する。机上確認の根拠であり、実機は Pi 3 / 4 / 5 とも `unverified`（[runtime-verification.md](./runtime-verification.md)、[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）。

関連:

- 親 Issue: [#250](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#256](https://github.com/gurezo/chirimen-raspi-docker/issues/256)
- HTML サンプル: [workspace/sht30/](../../workspace/sht30/)
- 回路図出典: [gc/i2c/i2c-SHT30/schematic.png](https://www.chirimen.org/chirimen/gc/i2c/i2c-SHT30/schematic.png)
- 移植元: [chirimen `gc/i2c/i2c-SHT30`](https://github.com/chirimen-oh/chirimen/tree/master/gc/i2c/i2c-SHT30)
- 互換性ルール: [schematic-compatibility.md](./schematic-compatibility.md)
- 実機記録: [runtime-verification.md](./runtime-verification.md)（[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）

## 目的

Raspberry Pi 3 / 4 / 5 で共通の、3.3V I2C1 に接続する SHT30 温湿度回路を 1 つに決める。

## ピン対応

| 役割 | BCM | 40-pin header 物理 pin | 備考 |
| --- | --- | --- | --- |
| SDA | `2` | `3` | I2C1。Pi 3 / 4 / 5 で同一 |
| SCL | `3` | `5` | I2C1。Pi 3 / 4 / 5 で同一 |
| 3.3V | — | `1` | 他の 3.3V ピンでも可 |
| GND | — | `6` | 他の GND ピンでも可 |

```text
requestI2CAccess()
  → ports.get(1)
  → open(0x44)
  → ワンショット測定（0x2C 0x06）
  → 温度 ℃ / 湿度 % 表示
```

| 項目 | 値 |
| --- | --- |
| device | SHT30 |
| address | `0x44`（ADDR ピン = GND の default。`0x45` ではない） |
| bus | I2C1（`/dev/i2c-1`、`ports.get(1)`） |

ADT7410 / ADS1115 の既定 `0x48` とはアドレスが異なる。同じ I2C1 に同時接続できる。

## 必要部品

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| SHT30 | 1 | I2C 温湿度センサ。address `0x44` |
| ジャンパワイヤ | 4 本以上 | SDA / SCL / 3.3V / GND へ |

モジュールに pull-up が無い場合は、SDA / SCL に 4.7kΩ を 3.3V へ上げる。

## 配線

```text
3.3V (物理 pin 1)
  → SHT30 VDD

SDA (物理 pin 3 / BCM 2)
  → SHT30 SDA

SCL (物理 pin 5 / BCM 3)
  → SHT30 SCL

GND (物理 pin 6)
  → SHT30 GND
  → SHT30 ADDR（0x44 にする場合）
```

禁止:

- **5V ピン**（物理 pin 2 / 4）へ接続しない

## Raspberry Pi 3 / 4 / 5 の pin assignment

| 確認項目 | 結果 |
| --- | --- |
| 40-pin header | SDA 物理 3、SCL 物理 5、3.3V 物理 1、GND 物理 6 |
| I2C | I2C1。`ports.get(1)`、`/dev/i2c-1` |
| 3.3V / 5V | センサ電源は 3.3V |
| Pi 固有特殊機能 | 40-pin I2C1 のみ |

机上確認は合格。`supportedRaspberryPi` は `["3","4","5"]`。実機結果は [runtime-verification.md](./runtime-verification.md)（Pi 3 / 4 / 5 とも `unverified`）。

## 期待結果

配線後、HTML サンプル（`http://127.0.0.1:4173/sht30/`）を開くと温度と湿度が更新される。Runtime 未接続時や slave 未応答時はページ上にエラーが出る。

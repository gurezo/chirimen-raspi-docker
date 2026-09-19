# GPIO PIR Sensor 回路仕様

人感センサー（KP-IR412）のデジタル出力を GPIO input / onchange で確認する回路を固定する。机上確認の根拠であり、実機は Pi 3 / 4 / 5 とも `unverified`（[runtime-verification.md](./runtime-verification.md)、[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）。

関連:

- 親 Issue: [#250](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#256 Legacy CHIRIMEN Examples を新 Browser Polyfill 向けに段階的に移植する](https://github.com/gurezo/chirimen-raspi-docker/issues/256)
- HTML サンプル: [workspace/pir-sensor/](../../workspace/pir-sensor/)
- 回路図出典: [gc/gpio/pirSensor/schematic.png](https://www.chirimen.org/chirimen/gc/gpio/pirSensor/schematic.png)
- 移植元: [chirimen `gc/gpio/pirSensor`](https://github.com/chirimen-oh/chirimen/tree/master/gc/gpio/pirSensor)
- 互換性ルール: [schematic-compatibility.md](./schematic-compatibility.md)
- 実機記録: [runtime-verification.md](./runtime-verification.md)（[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）

## 目的

Raspberry Pi 3 / 4 / 5 で共通の、3.3V GPIO に安全な人感センサー入力を 1 つに決める。

## ピン対応

| 役割 | BCM（`ports.get`） | 40-pin header 物理 pin | 備考 |
| --- | --- | --- | --- |
| GPIO input | `12` | `32` | Pi 3 / 4 / 5 で同一。polyfill の `CHIRIMEN_GPIO_PORTS` に含まれる。旧 pirSensor と同じ |
| GND | — | `34` | GPIO12 に近い GND。他の GND ピンでも可 |
| 3.3V | — | `17` | センサ電源。他の 3.3V ピン（物理 1）でも可 |

```text
requestGPIOAccess()
  → ports.get(12)
  → export('in')
  → onchange
  → 検知時 1 / 非検知 0（モジュールによる）
```

旧 pirSensor の `onchange` は値そのもの（`v === 1`）を受け取る。本 Runtime の Browser Polyfill は `{ value, portNumber }` を渡す。

## 必要部品

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| 人感センサー | 1 | KP-IR412。3.3V ロジック出力。ジェネリック HC-SR501 でも動作実績あり |
| ジャンパワイヤ | 3 本以上 | GPIO12、GND、3.3V へ |

## 配線

```text
3.3V (物理 pin 17)
  → センサ VCC

GPIO12 (物理 pin 32 / BCM 12)
  → センサ OUT

GND (物理 pin 34)
  → センサ GND
```

手順:

1. センサの VCC を **物理 pin 17**（3.3V）へ接続する
2. センサの OUT を **物理 pin 32**（BCM 12）へ接続する
3. センサの GND を **物理 pin 34**（GND）へ接続する

禁止:

- **5V ピン**（物理 pin 2 / 4）を GPIO 入力へ入れない
- 5V 出力モジュールをレベル変換なしで GPIO に接続しない
- GPIO 同士を短絡しない

Pi 3 / 4 / 5 で配線を変える必要はない。

## Raspberry Pi 3 / 4 / 5 の pin assignment

| 確認項目 | 結果 |
| --- | --- |
| 40-pin header | 物理 pin 32 = BCM 12、pin 34 = GND、pin 17 = 3.3V |
| BCM GPIO | `CHIRIMEN_GPIO_PORTS` に `12` が含まれる |
| 3.3V / 5V | センサ電源は 3.3V。GPIO へ 5V を入れない |
| Pi 固有特殊機能 | 40-pin GPIO のみ。CSI / DSI に依存しない |
| GPIO Input | BCM 5（物理 29）。本回路の 12 とは重ならない |
| LED Blink | BCM 26（物理 37）。本回路の 12 とは重ならない |

机上確認は合格。`supportedRaspberryPi` は `["3","4","5"]`。実機結果は [runtime-verification.md](./runtime-verification.md)（Pi 3 / 4 / 5 とも `unverified`）。

## 期待結果

配線後、HTML サンプル（`http://127.0.0.1:4173/pir-sensor/`）を開く。人が検知範囲に入ると `ON`、いなくなると `OFF`。Runtime 未接続時はページ上にエラーが出る。

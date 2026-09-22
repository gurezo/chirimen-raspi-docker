# CHIRIMEN Tutorial

GPIO / I2C / JavaScript / 回路の基礎は既存 CHIRIMEN Tutorial で学び、本リポジトリでは Docker Runtime と Editor / Example 実行に戻るための導線。

関連:

- 親 Issue: [#237 Browser Development Flow を Tutorial → Editor → Workspace → Example Server に再設計する](https://github.com/gurezo/chirimen-raspi-docker/issues/237)
- 子 Issue: [#239 CHIRIMEN Tutorial への学習導線を Documentation に追加する](https://github.com/gurezo/chirimen-raspi-docker/issues/239)
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築の正本）
- [Getting Started](./getting-started.md)（3段階。CHIRIMEN Setup は Step 2: `doctor.sh` → `start.sh`）
- [Browser Development Environment](./browser-development.md)（Editor で書く）
- 実機 E2E: [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)

Tutorial の環境構築手順は本リポジトリの手順ではない。clone / Docker / Runtime は本 Documentation を正本とする。

## 役割分担

```text
CHIRIMEN Tutorial
  GPIO / I2C / JavaScript / 回路を学ぶ

chirimen-raspi-docker
  Raspberry Pi 3 B+（Runtime-only）/ 4 / 5
  Docker Runtime
  Browser Editor（任意。Pi 3 B+ の基本体験には含めない）
  Example 実行環境
```

ユーザー向けの役割:

```text
Tutorial = 学ぶ
Catalog  = 題材を見つける（`:4200`）
Editor   = 書く
Examples = 書いたものを動かす（`:4173`）
```

GPIO / I2C の概念は Tutorial、配線ピン・抵抗値・Runtime 操作は本リポジトリの Example Guide と回路仕様を正本とする。同じ解説を両側に置かない。

## 2 つの Tutorial の使い分け

本リポジトリの対象は **Raspberry Pi 3 B+ / 4 / 5**（Pi 3 B+ は Runtime-only。Docker build は Pi 4 / Pi 5。正本は [Compatibility](../architecture/compatibility.md)）。Pi Zero / CHIRIMEN Lite は対象外。

| Tutorial | URL | 使う場面 |
| --- | --- | --- |
| Raspberry Pi Tutorial | [tutorial.chirimen.org/raspi](https://tutorial.chirimen.org/raspi/) | Model B 系向け。GPIO 出力 / 入力 / I2C センサーの第一候補 |
| PiZero Tutorial | [tutorial.chirimen.org/pizero](https://tutorial.chirimen.org/pizero/) | JavaScript 基礎、GPIO / I2C の理論、LED / ブレッドボード / 抵抗の付録。概念資料としてのみ使う |

Raspberry Pi Tutorial はハードウェア系統が近い。PiZero Tutorial は概念の説明が厚い。どちらも **セットアップ手順は使わない**。

## やってよいこと / やってはいけないこと

やってよいこと:

- GPIO / I2C / JavaScript / 回路の概念を Tutorial で読む
- 読み終わったら本リポジトリの Setup / Getting Started / Example Guide に戻る

やってはいけないこと（Tutorial 内の環境構築を本リポジトリの手順として使わない）:

- CHIRIMEN Lite / Pi Zero W のセットアップ
- CHIRIMEN for Raspberry Pi の SD イメージ書き込み
- `/home/pi/Desktop/gc/...` をダブルクリックして実行する手順
- CodeSandbox / JSFiddle / PiZero の `myApp` / JS Editor を本リポジトリの Editor として使うこと

本リポジトリでの対応:

| やりたいこと | 正本 |
| --- | --- |
| Host 構築（Raspberry Pi Setup） | [Raspberry Pi Setup](./raspberry-pi-setup.md) / [Getting Started Step 1](./getting-started.md#step-1-raspberry-pi-setup) |
| CHIRIMEN Setup（診断・起動） | [Getting Started Step 2](./getting-started.md#step-2-chirimen-setup) |
| 最初の Example | [Getting Started Step 3](./getting-started.md#step-3-run-your-first-example) / [GPIO LED Blink](./gpio-led-blink.md) |
| Example を書く | [Editor を開く](./browser-development.md#editor-を開く)（code-server `:8080`） |
| 書いたものを動かす | [Example Server を開く](./browser-development.md#example-server-を開く)（`:4173`） |
| 題材を見つける | [Example Catalog](../examples/catalog.md)（`:4200`） |
| Runtime を確認する | [Runtime Diagnostics](./runtime-diagnostics.md)（`doctor.sh` / `GET /health` / Reference Examples `:4173`） |

## 学びたいこと

| 学びたいこと | 優先 Tutorial | 戻ったら |
| --- | --- | --- |
| GPIO 出力 / L チカ / LED 極性 | [L チカしてみよう](https://tutorial.chirimen.org/raspi/section0) | [GPIO LED Blink](./gpio-led-blink.md) |
| GPIO 入力 / onchange | [GPIO の使い方](https://tutorial.chirimen.org/raspi/section1) | [GPIO Input](./gpio-input.md) |
| I2C の考え方 / センサー | [センサーを使ってみよう](https://tutorial.chirimen.org/raspi/section2) | [I2C Scan](./i2c-scan.md) |
| JavaScript / 非同期 / 電子工作の基礎 | [PiZero 概要](https://tutorial.chirimen.org/pizero/) と付録（概念のみ） | [Getting Started](./getting-started.md) / [CHIRIMEN Tutorial で学ぶ](./browser-development.md#chirimen-tutorial-で学ぶ) |

概念の補足（セットアップは読まない）:

| 概念 | Tutorial |
| --- | --- |
| GPIO とは | [GPIO を理解する](https://tutorial.chirimen.org/pizero/chapter_4-1) |
| I2C とは | [I2C を理解する](https://tutorial.chirimen.org/pizero/chapter_5-1) |
| ADT7410 の配線イメージ | [Hello Real World](https://tutorial.chirimen.org/raspi/hellorealworld)（温度読み取りは Tutorial 側。本リポジトリの I2C Scan は address 確認のみ） |

I2C Scan は bus 上の address を走査する。Tutorial の温度センサー Example（ADT7410 / SHT30 の `read()`）は本リポジトリの完了条件ではない。

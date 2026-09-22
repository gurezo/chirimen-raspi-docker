# chirimen-raspi-docker

Raspberry Pi 3 B+ / 4 / 5 で、ブラウザから GPIO / I2C を操作するための Docker ベース CHIRIMEN Runtime です。

## Supported Hardware / Recommended OS

- Raspberry Pi 3 B+（**Runtime-only**。on-device Docker build は Unsupported）
- Raspberry Pi 4（Runtime / Development。Docker build Supported）
- Raspberry Pi 5（Runtime / Development。Docker build Supported）

サポート対象は Raspberry Pi OS 64-bit。Recommended: Raspberry Pi OS Lite 64-bit。モデル別ロールの正本は [Compatibility](docs/architecture/compatibility.md)。

> 32-bit OS は非推奨です。[詳細を見る](docs/architecture/compatibility-32bit.md)

## Quick Start

初めて使う場合は [Getting Started](docs/guides/getting-started.md) の3段階に従ってください。機種別の build / Runtime 導線は Step 2 を正本とする。

```text
Getting Started
├─ Step 1: Raspberry Pi Setup（setups/）
├─ Step 2: CHIRIMEN Setup（doctor.sh → start.sh）
└─ Step 3: First Example（Catalog :4200 → :4173 / GPIO LED Blink）
```

Raspberry Pi Setup が済んでいるなら Step 2 から（Pi 4 / Pi 5 の例。既定で `--build`）:

```sh
./scripts/doctor.sh
./scripts/start.sh
curl http://127.0.0.1:33330/health
```

Pi 3 B+（Runtime-only）では `./scripts/start.sh --no-build` を使う。詳細は [Getting Started](docs/guides/getting-started.md)。

## Documentation

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

| 目的 | Documentation |
| --- | --- |
| GPIO / I2C / JavaScript / 回路を学ぶ | [CHIRIMEN Tutorial](docs/guides/chirimen-tutorial.md) |
| 初めて使う（3段階） | [Getting Started](docs/guides/getting-started.md) |
| Host 構築の詳細（Raspberry Pi Setup） | [Raspberry Pi Setup](docs/guides/raspberry-pi-setup.md) |
| Browser から Example を書く | [Browser Development](docs/guides/browser-development.md)（編集先は `workspace/`） |
| GPIO / I2C を試す | [Examples](https://gurezo.github.io/chirimen-raspi-docker/#use) / [GPIO LED Blink](docs/guides/gpio-led-blink.md) / [GPIO Input](docs/guides/gpio-input.md) / [I2C Scan](docs/guides/i2c-scan.md) |
| Example Catalog / Legacy 資産の出典を確認する | [catalog.md](docs/examples/catalog.md) |
| 問題を調べる | [Troubleshooting](docs/guides/troubleshooting.md) |
| 対応環境を確認する | [Compatibility](docs/architecture/compatibility.md)（Catalog / Runtime Example の機別実機は [runtime-verification.md](docs/examples/runtime-verification.md)。Browser Development Flow は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)） |
| 内部設計を調べる | [Architecture](docs/architecture/overview.md) |
| API を調べる | [API Reference](https://gurezo.github.io/chirimen-raspi-docker/api/) |

## Development

リポジトリをホスト上で開発する場合は [Development Guide](docs/guides/development.md) を参照してください。Runtime 利用に host の Node.js は不要です。on-device の Docker build は Raspberry Pi 4 / Pi 5 向けです（Pi 3 B+ は Runtime-only。詳細は [Development Guide](docs/guides/development.md) / [Compatibility](docs/architecture/compatibility.md)）。Service / Port / Workspace / `apps/` を変えたときは [Documentation checklist](docs/guides/documentation-checklist.md) で案内漏れを確認してください。

## License

[MIT License](./LICENSE)

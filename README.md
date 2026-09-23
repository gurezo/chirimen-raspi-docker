# chirimen-raspi-docker

Raspberry Pi 3 B+ / 4 / 5 で、ブラウザから GPIO / I2C を操作するための Docker ベース CHIRIMEN Runtime です。

## Supported Hardware / Recommended OS

- Raspberry Pi 3 B+（**Runtime-only**。on-device Docker build は Unsupported）
- Raspberry Pi 4（Runtime / Development。Docker build Supported）
- Raspberry Pi 5（Runtime / Development。Docker build Supported）

サポート対象は Raspberry Pi OS 64-bit。標準環境: Raspberry Pi OS 64-bit Desktop（Lite も可）。モデル別ロールの正本は [Compatibility](docs/architecture/compatibility.md)。

> 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](docs/architecture/compatibility-32bit.md)

## Quick Start

初めて使う場合は [Getting Started](docs/guides/getting-started.md) に従ってください。入口は `./setups/setup.sh` の 1 つです。

**初学者向けに確実な第一導線は Raspberry Pi 4 / Pi 5** です。ローカルに Docker image が無い初回は `docker compose up -d` が image を **build** します（Supported）。Pi 3 B+ は Runtime-only で on-device build は Unsupported です（image の用意が必要。詳細は [Getting Started の Step 2](docs/guides/getting-started.md#step-2-start-runtime)）。

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
./setups/setup.sh
# 必要なら sudo reboot のあと、同じ ./setups/setup.sh を再実行
docker compose up -d
```

起動後の第一入口: [http://localhost:4200](http://localhost:4200)（Example Catalog）

続けて [First Example（my-first-example）](docs/guides/getting-started.md#my-first-example-を作成する) で `workspace/` に HTML / JavaScript を作れます。Host に Node.js / npm / pnpm / Nx は不要です。詳細は [Getting Started](docs/guides/getting-started.md)。

## Documentation

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

| 目的 | Documentation |
| --- | --- |
| GPIO / I2C / JavaScript / 回路を学ぶ | [CHIRIMEN Tutorial](docs/guides/chirimen-tutorial.md) |
| 初めて使う（setup.sh → compose up → Catalog） | [Getting Started](docs/guides/getting-started.md) |
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

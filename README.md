# chirimen-raspi-docker

Raspberry Pi 3 B+ / 4 / 5 で、ブラウザから GPIO / I2C を操作するための Docker ベース CHIRIMEN Runtime です。

## Supported Hardware / Recommended OS

- Raspberry Pi 3 B+
- Raspberry Pi 4
- Raspberry Pi 5

Recommended: Raspberry Pi OS Lite 64-bit

> 32-bit OS は非推奨です。詳細は [Compatibility](docs/architecture/compatibility.md) を参照してください。

## Quick Start

初めて使う場合は、先に [Raspberry Pi Setup](docs/guides/raspberry-pi-setup.md) を完了してください。

```text
Raspberry Pi Setup
        ↓
./scripts/doctor.sh
        ↓
./scripts/start.sh
        ↓
curl http://localhost:33330/health
```

準備済みなら:

```sh
./scripts/doctor.sh
./scripts/start.sh
curl http://localhost:33330/health
```

手順の説明は [Getting Started](docs/guides/getting-started.md) を参照してください。

## Documentation

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

| 目的 | Documentation |
| --- | --- |
| 初めて使う | [Raspberry Pi Setup](docs/guides/raspberry-pi-setup.md) |
| Runtime を起動する | [Getting Started](docs/guides/getting-started.md) |
| GPIO / I2C を試す | [Examples](https://gurezo.github.io/chirimen-raspi-docker/#use) / [GPIO LED Blink](docs/guides/gpio-led-blink.md) |
| 問題を調べる | [Troubleshooting](docs/guides/troubleshooting.md) |
| 対応環境を確認する | [Compatibility](docs/architecture/compatibility.md) |
| 内部設計を調べる | [Architecture](docs/architecture/overview.md) |
| API を調べる | [API Reference](https://gurezo.github.io/chirimen-raspi-docker/api/) |

## Development

リポジトリをホスト上で開発する場合は [Development Guide](docs/guides/development.md) を参照してください。Runtime 利用に host の Node.js は不要です。

## License

[MIT License](./LICENSE)

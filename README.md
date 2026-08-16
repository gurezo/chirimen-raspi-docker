# chirimen-raspi-docker

Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Docker Runtime

このリポジトリは、Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Runtime を Docker / TypeScript / Nx Workspace ベースで再構築するための Monorepo です。詳細な構成は [アーキテクチャ概要](docs/architecture/overview.md) を参照してください。

## 最短の使い方

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
./scripts/doctor.sh
./scripts/start.sh
curl http://localhost:33330/health
```

手順の説明、32-bit / 64-bit の切り替え、container 内の device 確認は [Getting Started](docs/guides/getting-started.md) を参照してください。

## ドキュメント

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

初めての利用者はガイドから始めてください。公開 TypeScript API は [API リファレンス](https://gurezo.github.io/chirimen-raspi-docker/api/) を参照してください。

### 使い方

| ドキュメント                                                       | 内容                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [docs/guides/getting-started.md](docs/guides/getting-started.md)   | clone → doctor → `./scripts/start.sh` → health check                     |
| [docs/guides/browser-polyfill.md](docs/guides/browser-polyfill.md) | 旧 `polyfill.js` 相当の script 読み込み / IIFE bundle / web-demo         |
| [docs/guides/gpio-led-blink.md](docs/guides/gpio-led-blink.md)     | GPIO LED Blink 操作ガイド（HTML サンプルで点滅）                         |
| [docs/guides/gpio-input.md](docs/guides/gpio-input.md)             | GPIO Input 操作ガイド（HTML サンプルで onchange）                        |
| [docs/guides/i2c-scan.md](docs/guides/i2c-scan.md)                 | I2C Scan 操作ガイド（web-demo で address scan）                          |
| [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md)   | よくある起動・device 障害                                                |

### セットアップ

| ドキュメント                                                           | 内容                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [docs/guides/raspberry-pi-setup.md](docs/guides/raspberry-pi-setup.md) | Pi 上の Docker / GPIO / I2C セットアップ         |
| [setups/README.md](setups/README.md)                                   | host の Node / nvm / Docker インストール         |

### アーキテクチャ

| ドキュメント                                                             | 内容                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [docs/architecture/overview.md](docs/architecture/overview.md)           | アーキテクチャ概要 / Nx MCP                                                                         |
| [docs/architecture/docker.md](docs/architecture/docker.md)               | Docker / Compose / device mount / [Compatibility matrix](docs/architecture/docker.md#compatibility-matrix) |
| [docs/architecture/protocol.md](docs/architecture/protocol.md)           | Protocol メッセージモデル / [I2C Scan API flow](docs/architecture/protocol.md#i2c-scan-api-flow114) |
| [docs/architecture/nx-boundaries.md](docs/architecture/nx-boundaries.md) | Nx tags / module boundaries                                                                         |

### Compatibility（検証環境）

Raspberry Pi の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録します。未検証項目は `Supported` と書きません。正本は [Compatibility matrix](docs/architecture/docker.md#compatibility-matrix) です。

| ドキュメント | 内容 |
| --- | --- |
| [Compatibility matrix](docs/architecture/docker.md#compatibility-matrix) | Pi 3 B+ / 4 / 5、64-bit / 32-bit の実機検証結果 |
| [docs/examples/gpio-led-blink.md](docs/examples/gpio-led-blink.md) | GPIO LED Blink 回路仕様（BCM 26 / 物理 pin 37 / LED + 330Ω）                                                     |
| [docs/examples/gpio-input.md](docs/examples/gpio-input.md)         | GPIO Input 回路仕様（BCM 5 / 物理 pin 29 / タクトスイッチ + 10kΩ プルアップ）                                    |
| [docs/examples/i2c-scan.md](docs/examples/i2c-scan.md)             | I2C Scan 検証仕様（ADT7410 / `0x48` / I2C1。[#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116)） |

## 必要環境

- Node.js
- pnpm v11.x
- Docker
- Docker Compose

依存は root の `package.json` に集約した統合型 Nx モノレポ構成です。`apps/*` / `libs/*` に個別の `package.json` はありません。project 間の import（例: `from 'node-runtime'`）は `tsconfig.base.json` の `paths` で解決します。

## ローカル開発

```sh
pnpm install
npx nx show projects
npx nx build server
pnpm nx serve web-demo
npx nx graph
```

`pnpm nx serve web-demo` は `http://localhost:4200/` で Browser demo を起動します。`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`./scripts/start.sh` または `npx nx serve server`）を起動してください。操作手順は [Getting Started](docs/guides/getting-started.md) と [browser-polyfill.md](docs/guides/browser-polyfill.md) を参照してください。

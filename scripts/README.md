# scripts

Raspberry Pi Setup（[`setups/`](../setups/README.md)）が完了したあとに使う script と、開発・ドキュメント用の補助 script。Host の I2C / swap / Docker インストールは [`setups/`](../setups/README.md) の担当である。

`setups/` / `scripts/` の分類と呼び出し可否の正本は [Host setup script 棚卸し](../docs/guides/setup-host-script-audit.md) である。

## Beginner 起動（正本は Getting Started）

初心者の第一導線は `./setups/setup.sh` のあと `docker compose up -d` → `http://localhost:4200` である。正本は [Getting Started の Step 2](../docs/guides/getting-started.md#step-2-start-runtime)。`setup.sh` は内部で `doctor.sh` を readiness として実行する。

```text
./setups/setup.sh
        ↓
docker compose up -d
        ↓
http://localhost:4200
```

## Development / 上級者向け（doctor.sh / start.sh）

device マッピング・LAN 公開・Pi 4 / Pi 5 の on-device build が必要なときの補助。**beginner の第一導線ではない。**

```text
./scripts/doctor.sh（任意の再確認）
        ↓
./scripts/start.sh（Pi 4 / Pi 5。既定 --build）
  or --no-build（Pi 3 B+ Runtime-only）
```

`start.sh` 引数なしは既定で `--build` 相当のため、Pi 3 B+ では `--no-build` を付ける。詳細は [Development](../docs/guides/development.md) / [Compatibility](../docs/architecture/compatibility.md)。

| Script | 役割 | やらないこと |
| --- | --- | --- |
| `doctor.sh` | Host Setup **完了後**の読み取り専用診断。sudo 不要。`setup.sh` からも呼ばれる | Host 設定（I2C / swap / Docker）を変えない。失敗時は [Raspberry Pi Setup](../docs/guides/raspberry-pi-setup.md) へ戻る |
| `start.sh` | Development / 上級者向けの起動補助（Compose）。存在する GPIO / I2C device だけを渡す。既定は `--build`（Pi 4 / Pi 5）。Pi 3 B+ は `--no-build`。**Runtime 操作の正本は `docker compose up -d`** | I2C 有効化、swap、Docker Engine のインストールはしない。beginner 第一導線ではない |

`doctor.sh` の確認対象と失敗時の戻先:

| 確認 | 失敗時 |
| --- | --- |
| Raspberry Pi / OS / architecture | 実機と Raspberry Pi OS Lite 64-bit を確認する |
| Memory / Swap | `sudo ./setups/swap.sh`（任意。主用途は Pi 4 / Pi 5 の開発・Docker build。Runtime-only では必須ではない） |
| I2C / `/dev/i2c-*` | `sudo ./setups/enable-i2c.sh` |
| Docker Engine | `./setups/docker.sh` |
| Docker Compose | `./setups/docker-compose.sh` |
| Host capability | [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md) |

`[error]` があるときは Host 側の不足である。能力判定の読み方は [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md)。上級者向けの起動例:

```sh
./scripts/doctor.sh
./scripts/start.sh            # Pi 4 / Pi 5（既定で --build）
./scripts/start.sh --no-build # Pi 3 B+（Runtime-only）
```

## 開発・ドキュメント用（Runtime 起動ではない）

| Script | 役割 |
| --- | --- |
| `build-docs-site.mjs` | 公開 Documentation サイトの生成 |
| `build-server.mjs` | 32-bit Docker 用の server bundle（サポート対象外 OS 向け） |

これらは Host 構築でも Runtime 起動でもない。

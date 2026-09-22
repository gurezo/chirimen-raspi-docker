# scripts

Raspberry Pi Setup（[`setups/`](../setups/README.md)）が完了したあとに使う script と、開発・ドキュメント用の補助 script。Host の I2C / swap / Docker インストールは [`setups/`](../setups/README.md) の担当である。

## CHIRIMEN Setup

Host Setup 完了後の診断と Runtime 起動。手順の正本は [Getting Started の Step 2](../docs/guides/getting-started.md#step-2-chirimen-setup)。

```text
Raspberry Pi Setup 完了
        ↓
./scripts/doctor.sh
        ↓
./scripts/start.sh（Pi 4 / Pi 5）
  or --no-build（Pi 3 B+ Runtime-only）
        ↓
CHIRIMEN Ready
```

機種別のコマンドは [Getting Started の Step 2](../docs/guides/getting-started.md#step-2-chirimen-setup) を正本とする。`start.sh` 引数なしは既定で `--build` 相当のため、Pi 3 B+ では `--no-build` を付ける。

| Script | 役割 | やらないこと |
| --- | --- | --- |
| `doctor.sh` | Host Setup **完了後**の読み取り専用診断。sudo 不要 | Host 設定（I2C / swap / Docker）を変えない。失敗時は [Raspberry Pi Setup](../docs/guides/raspberry-pi-setup.md) へ戻る |
| `start.sh` | CHIRIMEN Runtime の起動（Compose）。存在する GPIO / I2C device だけを渡す。既定は `--build`（Pi 4 / Pi 5）。Pi 3 B+ は `--no-build` | I2C 有効化、swap、Docker Engine のインストールはしない |

`doctor.sh` の確認対象と失敗時の戻先:

| 確認 | 失敗時 |
| --- | --- |
| Raspberry Pi / OS / architecture | 実機と Raspberry Pi OS Lite 64-bit を確認する |
| Memory / Swap | `sudo ./setups/swap.sh`（任意。主用途は Pi 4 / Pi 5 の開発・Docker build。Runtime-only では必須ではない） |
| I2C / `/dev/i2c-*` | `sudo ./setups/enable-i2c.sh` |
| Docker Engine | `./setups/docker.sh` |
| Docker Compose | `./setups/docker-compose.sh` |
| Host capability | [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md) |

`[error]` が無ければ `./scripts/start.sh` へ進む（Pi 3 B+ は `--no-build`）。

```sh
./scripts/doctor.sh
./scripts/start.sh            # Pi 4 / Pi 5（既定で --build）
./scripts/start.sh --no-build # Pi 3 B+（Runtime-only）
```

`[error]` があるときは Host 側の不足である。能力判定の読み方は [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md)。

## 開発・ドキュメント用（CHIRIMEN Setup ではない）

| Script | 役割 |
| --- | --- |
| `build-docs-site.mjs` | 公開 Documentation サイトの生成 |
| `build-server.mjs` | 32-bit Docker 用の server bundle（サポート対象外 OS 向け） |

これらは Host 構築でも Runtime 起動でもない。

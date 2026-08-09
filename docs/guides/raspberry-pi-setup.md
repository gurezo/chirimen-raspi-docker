# Raspberry Pi setup

CHIRIMEN Runtime を Raspberry Pi 上で動かすための host 側セットアップ。

関連:

- [Getting Started](./getting-started.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- `scripts/doctor.sh` / `scripts/enable-i2c.sh`

## 前提 OS

- Raspberry Pi 3 / 4 / 5
- Raspberry Pi OS（Bookworm 想定。boot config は `/boot/firmware/config.txt`）

## Docker / Docker Compose

Runtime の起動入口は `docker compose up` のため、host に Docker と Compose が必要。

インストール後の確認例:

```sh
docker --version
docker compose version
docker info
```

daemon が動いていない場合は Docker を起動してから再度確認する。一括診断は後述の `doctor.sh` を使う。

## 事前診断（doctor）

`docker compose up` の前に、host の前提条件を一括確認できる。

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`scripts/doctor.sh` は sudo 不要で、次を確認する。

- Raspberry Pi model
- architecture（`aarch64` / `armv7l`）
- Docker（インストールと daemon 稼働）
- Docker Compose
- `/dev/gpiomem`
- `/dev/i2c-1`

結果は `[ok]` / `[error]` / `[warn]` で表示される。`[error]` がある場合は exit 1。

- **I2C 不足**: `[error]` とともに `scripts/enable-i2c.sh` の実行案内が出る
- **Pi 5 で `/dev/gpiomem` 不足**: `[warn]` と `/dev/gpiochip*` の案内が出る
- **非 Pi 環境**: Pi / device 関連が `[error]` になる

## GPIO

### host の確認

```sh
ls -l /dev/gpiomem
ls -l /sys/class/gpio
getent group gpio
```

- `/dev/gpiomem` と `/sys/class/gpio` が存在すること
- `gpio` グループの GID を控えておくこと（将来 container を non-root 化する際に `group_add` で合わせる）

現在の server image は root で起動するため、当面 `group_add` は必須ではない。

### Pi 3 / 4 と 5

- **Pi 3 / 4**: `/dev/gpiomem` が一般的。`compose.yaml` の設定で足りる想定
- **Pi 5**: `/dev/gpiomem` が無い、または `/dev/gpiochip*` が主になる場合がある。host で `ls -l /dev/gpiomem* /dev/gpiochip*` を確認し、必要な device を compose の `devices` に追加する

Compose 側の mount 方針は [docker.md](../architecture/docker.md) を参照。

## I2C

### host の確認

```sh
ls -l /dev/i2c-1
getent group i2c
```

- `/dev/i2c-1` が存在すること
- `i2c` グループの GID を控えておくこと（将来の non-root 化用）

### script で有効化する（推奨）

I2C が無効な場合:

```sh
chmod +x scripts/enable-i2c.sh
sudo ./scripts/enable-i2c.sh
sudo reboot
sudo ./scripts/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認する。script は `raspi-config` で I2C を有効化し、必要なら boot config に `dtparam=i2c_arm=on` を追加する。**reboot が必要**。

### 手動で有効化する

1. `sudo raspi-config` → Interface Options → I2C → Enable
2. または `/boot/firmware/config.txt`（Bookworm）に `dtparam=i2c_arm=on` を追加
3. reboot 後、`ls -l /dev/i2c-1` で device を確認

### Pi 3 / 4 / 5

標準の primary bus は `/dev/i2c-1`。別名 bus（例: `/dev/i2c-0`）が必要な場合は host で `ls -l /dev/i2c-*` を確認し、必要な device を compose の `devices` に追加する。

## セットアップ後

再び doctor を通し、Getting Started の起動手順へ進む。

```sh
./scripts/doctor.sh
```

→ [Getting Started](./getting-started.md)

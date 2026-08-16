# Raspberry Pi setup

CHIRIMEN Runtime を Raspberry Pi 上で動かすための host 側セットアップ。

関連:

- [Getting Started](./getting-started.md)
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- [setups/README.md](../../setups/README.md)（host の Node / nvm / Docker インストール）
- `scripts/doctor.sh` / `scripts/start.sh` / `scripts/enable-i2c.sh`

## 前提 OS

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility matrix](../architecture/docker.md#compatibility-matrix)）
- Raspbian OS 64-bit（Bookworm 想定。boot config は `/boot/firmware/config.txt`）、または Pi 3 B+ / Pi 4 の Raspbian OS 32-bit（[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）

## Docker / Docker Compose

Runtime の推奨起動入口は `./scripts/start.sh` のため、host に Docker と Compose が必要。未導入なら [setups/README.md](../../setups/README.md) の手順（`setups/docker.sh` → reboot → `setups/docker-compose.sh`）を使う。

インストール後の確認例:

```sh
docker --version
docker compose version
docker info
```

daemon が動いていない場合は Docker を起動してから再度確認する。一括診断は後述の `doctor.sh` を使う。

## 事前診断（doctor）

`./scripts/start.sh` の前に、host の前提条件を一括確認できる。

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`scripts/doctor.sh` は sudo 不要で、次を確認する。

- Raspberry Pi model
- architecture（`aarch64` / `armv7l`）
- Docker（インストールと daemon 稼働）
- Docker Compose
- hardware capabilities（Server / Node Runtime と同じ判定基準）
  - `/sys/class/gpio`
  - `/dev/gpiomem*`
  - `/dev/gpiochip*`
  - `/dev/i2c-1`

結果は `[ok]` / `[error]` / `[warn]` で表示される。末尾に server startup と同じ語彙の `[ capabilities ] gpio=... i2c=...` が出る。`[error]` がある場合は exit 1。

- **GPIO `sysfs`**: `/sys/class/gpio` があり、現行 backend で利用可能
- **GPIO `gpiochip`**: sysfs が無く `/dev/gpiochip*` のみ → `[warn]` + unsupported（backend 未実装）
- **GPIO `unavailable`**: GPIO interface が無い → `[warn]`
- **I2C `unavailable`**: `[error]` とともに `scripts/enable-i2c.sh` の実行案内が出る
- **非 Pi 環境**: Pi / device 関連が `[error]` / `[warn]` になる

## GPIO

### host の確認

```sh
ls -l /sys/class/gpio
ls -l /dev/gpiomem* /dev/gpiochip*
getent group gpio
```

- `/sys/class/gpio` があること（現行 sysfs backend の主経路）
- `/dev/gpiomem*` は任意（無くても sysfs があればよい）
- `gpio` グループの GID を控えておくこと（将来 container を non-root 化する際に `group_add` で合わせる）

現在の server image は root で起動するため、当面 `group_add` は必須ではない。

### Pi 3 / 4 と 5

- **同一手順**: `./scripts/start.sh` が存在する device だけを渡す。モデルごとの compose 手編集は不要
- **`gpiomem`**: Pi 3 / 4 では一般的。Pi 5 では無いことがある
- **`gpiochip*`**: 存在すれば container にも渡る（backend は別 Issue）
- **Pi 3 B+（#97 / #135）**: Raspbian OS 64-bit（`aarch64`）および 32-bit（`armv7l`）で `/sys/class/gpio` が利用可能。Runtime は `gpio=sysfs` / `i2c=i2c-dev`。32-bit は Node 22 / `Dockerfile.32bit`。詳細は [docker.md](../architecture/docker.md) の「Pi 3 B+ 実機検証」。A+ はスペック不足のため推奨環境外
- **Pi 4（#98 / #135）**: Raspbian OS 64-bit（`aarch64`）および 32-bit（64-bit kernel / `aarch64`）で `/sys/class/gpio` が利用可能。Runtime は `gpio=sysfs` / `i2c=i2c-dev`。詳細は [docker.md](../architecture/docker.md) の「Pi 4 実機検証」
- **Pi 5（#99）**: `/sys/class/gpio` が利用可能で Runtime は `gpio=sysfs`。sysfs 経路で GPIO 実アクセスまで確認済みのため、Pi 5 専用 gpiochip backend は追加しない

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

標準の primary bus は `/dev/i2c-1`。`./scripts/start.sh` が存在時のみ container に渡す。別名 bus（例: `/dev/i2c-0`）が必要な場合は host で `ls -l /dev/i2c-*` を確認する。

## セットアップ後

再び doctor を通し、Getting Started の起動手順へ進む。

```sh
./scripts/doctor.sh
./scripts/start.sh
```

→ [Getting Started](./getting-started.md)

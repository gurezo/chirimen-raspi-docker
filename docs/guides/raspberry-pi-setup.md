# Raspberry Pi setup

CHIRIMEN Runtime を Raspberry Pi 上で動かすための host 側セットアップ。`setups/*.sh` と `scripts/*` はリポジトリ内にあるため、**先に clone する**。

推奨順:

```text
clone → このページ（Docker / GPIO / I2C / doctor） → [Getting Started](./getting-started.md)（起動）
```

関連:

- [Getting Started](./getting-started.md)（このページのあと。Runtime の起動）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- [Compatibility matrix](../architecture/compatibility.md)
- [setups/README.md](../../setups/README.md)（host の Docker / Docker Compose インストール）
- `scripts/doctor.sh` / `scripts/start.sh` / `scripts/enable-i2c.sh`

## 前提 OS

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility matrix](../architecture/compatibility.md)）
- Raspbian OS 64-bit（Bookworm 想定。boot config は `/boot/firmware/config.txt`）
- 32-bit OS はサポート対象外

## リポジトリを clone する

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
```

以降の `setups/docker.sh` と `scripts/doctor.sh` / `scripts/enable-i2c.sh` は、clone したディレクトリで実行する。

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
- architecture（推奨は `aarch64`。`armv7l` は 32-bit OS のためサポート対象外）
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
- **`gpiomem`**: Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（無くても sysfs があればよい）
- **`gpiochip*`**: 存在すれば container にも渡る（backend は別 Issue）
- **Pi 3 B+（#97）**: Raspbian OS 64-bit（`aarch64`）で `/sys/class/gpio` が利用可能。Runtime は `gpio=sysfs` / `i2c=i2c-dev`。詳細は [compatibility.md](../architecture/compatibility.md) の「Pi 3 B+ 実機検証」。A+ はスペック不足のため推奨環境外
- **Pi 4（#98）**: Raspbian OS 64-bit（`aarch64`）で `/sys/class/gpio` が利用可能。Runtime は `gpio=sysfs` / `i2c=i2c-dev`。詳細は [compatibility.md](../architecture/compatibility.md) の「Pi 4 実機検証」
- **Pi 5（#99）**: Raspbian OS 64-bit（`aarch64` / `2712`）で `/sys/class/gpio` が利用可能。Runtime は `gpio=sysfs`。sysfs 経路で GPIO 実アクセスまで確認済みのため、Pi 5 専用 gpiochip backend は追加しない

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

再び doctor を通し、`[error]` が無ければ [Getting Started](./getting-started.md) の起動手順へ進む。Runtime の起動（`./scripts/start.sh`）はこのページでは行わない。

```sh
./scripts/doctor.sh
```

→ [Getting Started](./getting-started.md)

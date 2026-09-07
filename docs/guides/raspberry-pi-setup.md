# Raspberry Pi Setup

CHIRIMEN Runtime を Raspberry Pi 上で動かすための host 側セットアップ。`setups/*.sh` と `scripts/*` はリポジトリ内にあるため、**先に clone する**。Docker の前に I2C を有効化する。

推奨順:

```text
clone → I2C（enable-i2c.sh → 必要なら reboot → --check） → Docker / Compose → 低スペックなら swap.sh → GPIO 確認 → doctor → Getting Started（起動）
```

関連:

- [Getting Started](./getting-started.md)（このページのあと。Runtime の起動）
- [Browser Development Environment](./browser-development.md)（Editor から Example を編集・実行する）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- [Compatibility](../architecture/compatibility.md)（I2C Host Setup → Runtime は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)）
- [setups/README.md](../../setups/README.md)（host の Docker / Docker Compose / swap。Pi 3 B+ は 8GB swap と CPU ファン必須）
- `scripts/enable-i2c.sh` / `setups/docker.sh` / `setups/swap.sh` / `scripts/doctor.sh` / `scripts/start.sh`

## スクリプトの責務

| スクリプト | 責務 |
| --- | --- |
| `scripts/enable-i2c.sh` | ホスト I2C の有効化。`--check` は設定変更なし・sudo 不要で `/dev/i2c-1` を確認する |
| `setups/docker.sh` / `setups/docker-compose.sh` | Docker / Compose のインストールのみ。I2C 設定は変更しない |
| `setups/swap.sh` | 低スペック機向けに swap を確保する。I2C 設定は変更しない |
| `scripts/doctor.sh` | Runtime 起動前の診断のみ。I2C 無効時は `enable-i2c.sh` を案内し、設定は変えない |
| `scripts/start.sh` | 準備済み環境で Runtime を起動する。I2C 設定は変更しない（このページでは実行しない） |

## 前提 OS

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）
- Raspberry Pi OS 64-bit（Bookworm 想定。boot config は `/boot/firmware/config.txt`）
- Recommended: Raspberry Pi OS Lite 64-bit

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

## リポジトリを clone する

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
```

以降の `scripts/enable-i2c.sh` と `setups/docker.sh` / `setups/swap.sh` / `scripts/doctor.sh` は、clone したディレクトリで実行する。

## I2C

Docker セットアップの前に、ホストで I2C を有効化し `/dev/i2c-1` を確認する。

### script で有効化する（推奨）

```sh
chmod +x scripts/enable-i2c.sh
sudo ./scripts/enable-i2c.sh
sudo reboot
```

再接続後:

```sh
cd chirimen-raspi-docker
./scripts/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認する。sudo は不要で、設定は変更しない。script は `raspi-config` で I2C を有効化し、必要なら boot config に `dtparam=i2c_arm=on` を追加する。**reboot が必要**。

### host の確認

```sh
ls -l /dev/i2c-1
getent group i2c
```

- `/dev/i2c-1` が存在すること
- `i2c` グループの GID を控えておくこと（将来の non-root 化用）

### 手動で有効化する

1. `sudo raspi-config` → Interface Options → I2C → Enable
2. または `/boot/firmware/config.txt`（Bookworm）に `dtparam=i2c_arm=on` を追加
3. reboot 後、`ls -l /dev/i2c-1` で device を確認

### Pi 3 / 4 / 5

標準の primary bus は `/dev/i2c-1`。`./scripts/start.sh` が存在時のみ container に渡す。別名 bus（例: `/dev/i2c-0`）が必要な場合は host で `ls -l /dev/i2c-*` を確認する。

## Docker / Docker Compose

I2C 確認のあと、host に Docker と Compose を入れる。Runtime の推奨起動入口は `./scripts/start.sh` のため、両方が必要。未導入なら [setups/README.md](../../setups/README.md) の手順（`setups/docker.sh` → reboot → `setups/docker-compose.sh`）を使う。`docker.sh` は I2C 設定を変更しない。

インストール後の確認例:

```sh
docker --version
docker compose version
docker info
```

daemon が動いていない場合は Docker を起動してから再度確認する。一括診断は後述の `doctor.sh` を使う。

## 低スペック機の swap（swap.sh）

RAM が少ないホスト（1GB 級。代表は Raspberry Pi 3 B+）では、Docker image ビルド前に `setups/swap.sh` で swap を確保する。

```sh
sudo ./setups/swap.sh
sudo ./setups/swap.sh --check
free -h
```

既定は 8G の `/swapfile`。サイズを変える例: `sudo ./setups/swap.sh --size 8G`。`./scripts/start.sh` の前に実行する。

Raspberry Pi 3 B+ でビルドするときは、次の **両方** が必須である。片方だけでは足りない。

- **8GB swap**: 無いと image をビルドできない
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止）を防ぐために **必ず実装する**。電源投入前に装着する。特定型番は指定しない

Pi 4 / 5 の swap / ファンは任意。メモリ不足や OOM が出る場合も `swap.sh` を提案する。

詳細は [setups/README.md](../../setups/README.md)。OOM や熱暴走の切り分けは [troubleshooting.md](./troubleshooting.md)。

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
- 機種別の実機検証結果は [Compatibility](../architecture/compatibility.md) を参照する。Raspberry Pi 3 A+ はスペック不足のため推奨環境外

Compose 側の mount 方針は [docker.md](../architecture/docker.md) を参照。

## 事前診断（doctor）

I2C と Docker（低スペックなら `swap.sh`）の準備のあと、`./scripts/start.sh` の前に host の前提条件を一括確認できる。

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`scripts/doctor.sh` は sudo 不要の診断専用スクリプトである。I2C 設定は変更しない（`raspi-config` / boot config は触らない）。次を確認する。

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
- **I2C `available`**: `/dev/i2c-1` がある → `[ok] I2C: available (/dev/i2c-1)` と `i2c backend: i2c-dev`
- **I2C `unavailable`**: `/dev/i2c-1` が無い → `[error] I2C: unavailable` とともに次を案内する（doctor 自身は設定を変えない）

```sh
sudo ./scripts/enable-i2c.sh
sudo reboot
./scripts/enable-i2c.sh --check
```

- **非 Pi 環境**: Pi / device 関連が `[error]` / `[warn]` になる

## セットアップ後

doctor で `[error]` が無ければ [Getting Started](./getting-started.md) の起動手順へ進む。Runtime の起動（`./scripts/start.sh`）はこのページでは行わない。`start.sh` は I2C 設定を変更しない。

```sh
./scripts/doctor.sh
```

→ [Getting Started](./getting-started.md)

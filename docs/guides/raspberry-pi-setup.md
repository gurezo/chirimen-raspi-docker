# Raspberry Pi Setup

CHIRIMEN Runtime を Raspberry Pi 上で動かすための host 側セットアップ。`setups/*.sh` と `scripts/*` はリポジトリ内にあるため、**先に clone する**。標準 OS は **Raspberry Pi OS Lite 64-bit**。上から順に実行する。

標準実行順:

```text
clone
      ↓
1. swap.sh
2. enable-i2c.sh  → 必要なら reboot → --check
3. disable-squeekboard.sh
4. docker.sh      → スクリプトが reboot する
5. docker-compose.sh
      ↓
Raspberry Pi Setup 完了
      ↓
GPIO 確認 → doctor → Getting Started（起動）
```

関連:

- [Getting Started](./getting-started.md)（このページのあと。Runtime の起動）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / JavaScript / 回路を学ぶ。環境構築はここではない）
- [Browser Development Environment](./browser-development.md)（Editor から Example を編集・実行する）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- [Compatibility](../architecture/compatibility.md)（I2C Host Setup → Runtime は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。Browser Development Flow は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [setups/README.md](../../setups/README.md)（同じ5コマンドの短縮手順。Pi 3 B+ は 8GB swap と CPU ファン必須）
- `setups/swap.sh` / `setups/enable-i2c.sh` / `setups/disable-squeekboard.sh` / `setups/docker.sh` / `setups/docker-compose.sh` / `scripts/doctor.sh` / `scripts/start.sh`

## スクリプトの責務

| 順 | スクリプト | なぜ実行するか | 変更する Host 設定 | reboot | 再実行 |
| --- | --- | --- | --- | --- | --- |
| 1 | `setups/swap.sh` | Docker image ビルド前にメモリ不足を避ける。Pi 3 B+ では必須。Pi 4 / 5 でも同じコマンドでよい | `/swapfile`（既定 8G）作成、`swapon`、`/etc/fstab` 追記。I2C は触らない | 不要（即時有効。fstab で永続） | 同一サイズなら変更しない。サイズが違うときだけ作り直す |
| 2 | `setups/enable-i2c.sh` | I2C Example と Runtime が `/dev/i2c-1` を使うため | `raspi-config nonint do_i2c 0`、なければ boot config に `dtparam=i2c_arm=on` | `/dev/i2c-1` が無いときは **必要**。既にあれば不要 | `/dev/i2c-1` があれば設定を触らない。`--check` は sudo 不要で設定変更なし |
| 3 | `setups/disable-squeekboard.sh` | Desktop で Browser Editor / Catalog を使うとき、スクリーンキーボードが出ないようにする。**Lite では変更せず終わる**（実行してよい） | Desktop なら `raspi-config nonint do_squeekboard S3`（Always Off）。I2C / Docker / swap は触らない | 通常不要。残る場合のみ再ログインまたは reboot | Lite / 非 Desktop / 既に Off なら変更せず終了。`--check` は sudo 不要 |
| 4 | `setups/docker.sh` | Runtime を Compose で動かす Docker Engine を入れる | `apt` 更新、get.docker.com、`usermod -aG docker pi`。I2C は触らない | **スクリプト末尾が必ず `sudo reboot`** | 再実行しても apt / インストーラのあと reboot する |
| 5 | `setups/docker-compose.sh` | `./scripts/start.sh` が Compose を使うため | `/usr/local/bin/docker-compose` を置く | 不要。**docker.sh の reboot 後** に実行する | 上書きインストール |
| — | `scripts/doctor.sh` | Runtime 起動前の診断のみ。I2C 無効時は `enable-i2c.sh` を案内し、設定は変えない | なし | 不要 | 何度でも実行できる |
| — | `scripts/start.sh` | 準備済み環境で Runtime を起動する（このページでは実行しない）。初回の対話起動で Editor password を `.env` へ書く | I2C 設定は変更しない | 不要 | — |

`start.sh` / `doctor.sh` は `docker compose` プラグインを優先する。`docker-compose.sh` は standalone の `docker-compose` を入れる現行スクリプトである。完了確認は `docker compose version` を主とし、無ければ `docker-compose --version`。

## 前提 OS

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）
- Raspberry Pi OS 64-bit（Bookworm 想定。boot config は `/boot/firmware/config.txt`）
- **標準環境: Raspberry Pi OS Lite 64-bit**
- Pi 3 B+ / 4 / 5 は同じ5コマンド。差は swap の必要性（3 B+ は必須、4 / 5 は任意だが標準順では実行してよい）と、後述 GPIO 確認の `gpiomem` パス

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

CHIRIMEN Tutorial の SD イメージ書き込み、CHIRIMEN Lite、Pi Zero のセットアップは、このページの手順ではない。host 準備は clone したこのリポジトリの script を使う。GPIO / I2C の学習は [CHIRIMEN Tutorial](./chirimen-tutorial.md)。

## Raspberry Pi Setup の完了状態

次を満たせば Host 準備は完了である。Runtime の起動はこのページでは行わない。

- リポジトリを clone 済み
- `sudo ./setups/swap.sh --check` が通る（標準順で実行した場合）
- `./setups/enable-i2c.sh --check` で `/dev/i2c-1` がある
- `./setups/disable-squeekboard.sh --check` を実行済み（Lite は `[info]` で変更なしでも完了）
- `docker --version` / `docker info` が通る（`docker.sh` 後の reboot 済み）
- `docker compose version` が通る（無ければ `docker-compose --version`）

GPIO の host 確認はスクリプトではないが、既存の確認項目としてこのページで行う。そのあと `./scripts/doctor.sh` で `[error]` が無ければ [Getting Started](./getting-started.md) へ進む。

## リポジトリを clone する

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
```

以降の `setups/*.sh` と `scripts/doctor.sh` は、clone したディレクトリで実行する。

## 1. swap.sh

Docker image ビルドの前に swap を確保する。RAM が少ないホスト（1GB 級。代表は Raspberry Pi 3 B+）では必須である。Pi 4 / 5 の swap / ファンは任意だが、標準順では同じコマンドを実行してよい。`swap.sh` は I2C 設定を変更しない。

```sh
sudo ./setups/swap.sh
sudo ./setups/swap.sh --check
free -h
```

既定は 8G の `/swapfile`。サイズを変える例: `sudo ./setups/swap.sh --size 8G`。`/etc/fstab` にも追記するので reboot 後も有効。**reboot は不要**（即時有効）。同一サイズなら再実行しても作り直さない。

Raspberry Pi 3 B+ でビルドするときは、次の **両方** が必須である。片方だけでは足りない。

- **8GB swap**: 無いと image をビルドできない
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止）を防ぐために **必ず実装する**。電源投入前に装着する。特定型番は指定しない

Pi 4 / 5 でメモリ不足や OOM が出る場合も `swap.sh` を提案する。OOM や熱暴走の切り分けは [Troubleshooting](./troubleshooting.md)。短縮手順は [setups/README.md](../../setups/README.md)。

`docker.sh` の対象ユーザーは現行スクリプトどおり `pi` である。ログインユーザー名が違う環境でも `swap.sh` 自体は動く。Docker グループ追加の注意は手順 4 を参照する。

## 2. enable-i2c.sh

ホストで I2C を有効化し `/dev/i2c-1` を確認する。I2C Example と Runtime がこの device を使う。

### script で有効化する（推奨）

```sh
chmod +x setups/enable-i2c.sh
sudo ./setups/enable-i2c.sh
```

`/dev/i2c-1` がまだ無いときは **reboot が必要** である。

```sh
sudo reboot
```

再接続後:

```sh
cd chirimen-raspi-docker
./setups/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認する。sudo は不要で、設定は変更しない。script は `raspi-config` で I2C を有効化し、必要なら boot config に `dtparam=i2c_arm=on` を追加する。既に `/dev/i2c-1` があれば設定を触らない。

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

## 3. disable-squeekboard.sh

標準順の3番である。Raspberry Pi OS **Desktop**（Bookworm 以降・Wayland）では、テキスト欄にフォーカスするとスクリーンキーボード（Squeekboard）が出ることがある。物理キーボード付きで Browser Editor（`:8080`）や Catalog を使うときに Always Off にする。

**Lite が標準環境である。** Lite にはスクリーンキーボードが無い。スクリプトは Desktop を検出しなければ設定を変えずに終了する。Lite でもこの手順を実行してよい。

```sh
sudo ./setups/disable-squeekboard.sh
./setups/disable-squeekboard.sh --check   # sudo 不要
```

`--check` は設定を変えず、現状だけ出す。sudo は不要。再実行しても設定を壊さない。反映は即時のことがある。残る場合は再ログインまたは reboot。I2C / Docker / swap の設定は変更しない。

手動:

- GUI: Control Centre → Display → On-screen keyboard → Disabled
- TUI: `sudo raspi-config` → Display Options → D6 Onscreen Keyboard → S3 Always Off

対象は Bookworm 以降の Squeekboard だけである。古い X11 の `onboard` / `matchbox-keyboard` は対象外。Lite や `do_squeekboard` が無い環境では設定を変えずに終了する。

## 4. docker.sh

I2C 確認のあと、host に Docker Engine を入れる。Runtime の推奨起動入口は `./scripts/start.sh` のため Docker が必要である。`docker.sh` は I2C 設定を変更しない。

```sh
./setups/docker.sh
```

`docker.sh` は `apt` の更新、get.docker.com によるインストール、`usermod -aG docker pi` を行う。**スクリプト末尾が必ず `sudo reboot` する。** reboot 後に手順 5 へ進む。再実行しても apt / インストーラのあと再び reboot する。

現行スクリプトのグループ追加先はユーザー `pi` である。ログイン名が `pi` でないときは、reboot 後に自分のユーザーを Docker グループへ追加する。

```sh
sudo usermod -aG docker "$USER"
```

新しいグループを使うには、一度ログアウトするか reboot する。

## 5. docker-compose.sh

`docker.sh` の reboot 後に Compose を入れる。I2C 設定は変更しない。

```sh
./setups/docker-compose.sh
```

このスクリプトは `/usr/local/bin/docker-compose` を置く。`./scripts/start.sh` と `./scripts/doctor.sh` は `docker compose` プラグインを優先する。get.docker.com 導入後はプラグインが既にあることが多い。完了確認は次を使う。

```sh
docker --version
docker compose version
docker info
```

`docker compose version` が無いときは `docker-compose --version`。daemon が動いていない場合は Docker を起動してから再度確認する。一括診断は後述の `doctor.sh` を使う。

## GPIO

setup script のあと、host の GPIO device を確認する。この節は `setups/*.sh` ではない。

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
- 機種別の実機検証結果は [Compatibility](../architecture/compatibility.md) を参照する。Raspberry Pi 3 A+ はスペック不足のため推奨環境外。Browser Development Flow の一連は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)

Compose 側の mount 方針は [docker.md](../architecture/docker.md) を参照。

## 事前診断（doctor）

5つの setup script のあと、`./scripts/start.sh` の前に host の前提条件を一括確認できる。

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
sudo ./setups/enable-i2c.sh
sudo reboot
./setups/enable-i2c.sh --check
```

- **非 Pi 環境**: Pi / device 関連が `[error]` / `[warn]` になる

## セットアップ後

doctor で `[error]` が無ければ [Getting Started](./getting-started.md) の起動手順へ進む。Runtime の起動（`./scripts/start.sh`）はこのページでは行わない。`start.sh` は I2C 設定を変更しない。初回の対話 `start.sh` で Browser Editor の password を決める。

```sh
./scripts/doctor.sh
```

→ [Getting Started](./getting-started.md)

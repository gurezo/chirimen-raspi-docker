# Raspberry Pi Setup

Raspberry Pi OS を CHIRIMEN Runtime が動く Host にするための **Raspberry Pi Setup**（Host Setup）。`setups/*.sh` はリポジトリ内にあるため、**先に clone する**。推奨環境は **Raspberry Pi OS Lite 64-bit**。Runtime の起動（`docker compose up -d`）はこのページでは行わない。

## 導線の分離

```text
Beginner / Runtime
  git clone
    → ./setups/setup.sh
    →（必要なら reboot → setup.sh 再実行）
    → docker compose up -d
    → http://localhost:4200

Development / Build（Pi 4 / Pi 5 のみ）
  swap.sh（OOM 緩和）
  docker build / compose build / up --build
  → 手順は [Development](./development.md)
```

`swap.sh` と Docker build は **Development-only** である。beginner flow / `setup.sh` からは実行しない。**Pi 3 B+ は Runtime-only**（on-device build は Unsupported。[Compatibility](../architecture/compatibility.md)）。

### Beginner / Runtime（推奨）

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
./setups/setup.sh
```

`setup.sh` は必要な Host script だけを呼び、`workspace/` と Runtime readiness（`doctor.sh`）を確認する。完了後に `docker compose up -d` と `http://localhost:4200` を案内する。詳細は [setups/README.md](../../setups/README.md)。

### Advanced / Manual Setup

個別確認向け。初心者は上の `setup.sh` を使う。`swap.sh` は含めない。

```text
clone
      ↓
1. enable-i2c.sh  → 必要なら reboot → --check
2. disable-squeekboard.sh
3. docker.sh      → スクリプトが reboot する
4. docker-compose.sh
      ↓
GPIO の host 確認
      ↓
Raspberry Pi Setup 完了
      ↓
Getting Started Step 2: docker compose up -d → http://localhost:4200
```

関連:

- [Getting Started](./getting-started.md)（入口。このページのあとは **Step 2: Start Runtime**）
- [Host setup script 棚卸し](./setup-host-script-audit.md)（Runtime / Development 分類の正本）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / JavaScript / 回路を学ぶ。環境構築はここではない）
- [Browser Development Environment](./browser-development.md)（Editor から Example を編集・実行する）
- [Development](./development.md)（リポジトリ開発・on-device Docker build。Pi 4 / Pi 5）
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Docker 構成](../architecture/docker.md)
- [Compatibility](../architecture/compatibility.md)（I2C Host Setup → Runtime は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。Browser Development Flow は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [setups/README.md](../../setups/README.md)（短縮手順。`swap.sh` は Development-only）
- `setups/setup.sh` / `setups/enable-i2c.sh` / `setups/disable-squeekboard.sh` / `setups/docker.sh` / `setups/docker-compose.sh` / `setups/swap.sh`（Development-only）

## スクリプトの責務

このページの対象は `setups/*.sh` だけである。Host 設定を変える。

| 順 | スクリプト | なぜ実行するか | 変更する Host 設定 | reboot | 再実行 |
| --- | --- | --- | --- | --- | --- |
| 1 | `setups/enable-i2c.sh` | I2C Example と Runtime が `/dev/i2c-1` を使うため | `raspi-config nonint do_i2c 0`、なければ boot config に `dtparam=i2c_arm=on` | `/dev/i2c-1` が無いときは **必要**。既にあれば不要 | `/dev/i2c-1` があれば設定を触らない。`--check` は sudo 不要で設定変更なし |
| 2 | `setups/disable-squeekboard.sh` | Desktop で Browser Editor / Catalog を使うとき、スクリーンキーボードが出ないようにする。**Lite では変更せず終わる**（実行してよい） | Desktop なら `raspi-config nonint do_squeekboard S3`（Always Off）。I2C / Docker / swap は触らない | 通常不要。残る場合のみ再ログインまたは reboot | Lite / 非 Desktop / 既に Off なら変更せず終了。`--check` は sudo 不要 |
| 3 | `setups/docker.sh` | Runtime を Compose で動かす Docker Engine を入れる | `apt` 更新、get.docker.com、`usermod -aG docker pi`。I2C は触らない | **スクリプト末尾が必ず `sudo reboot`** | 再実行しても apt / インストーラのあと reboot する |
| 4 | `setups/docker-compose.sh` | beginner の `docker compose up -d` と上級者向け `start.sh` が Compose を使うため | `/usr/local/bin/docker-compose` を置く | 不要。**docker.sh の reboot 後** に実行する | 上書きインストール |
| — | `setups/swap.sh` | **Development-only**。Pi 4 / Pi 5 の Source Development / Docker build 時の OOM 緩和。Runtime / beginner では必須ではない | `/swapfile`（既定 8G）作成、`swapon`、`/etc/fstab` 追記。I2C と OS 既定 Swap（`dphys-swapfile` / `/var/swap` / zram）は触らない | 不要（即時有効。fstab で永続） | 同一サイズなら変更しない。サイズが違うときだけ `/swapfile` を作り直す。`--check` は変更なし |

`setups/setup.sh` は上記 1〜4 のうち必要なものだけを呼び出す orchestration である。`swap.sh` / Docker build / `start.sh` は呼ばない。

### このページの対象外（Runtime 起動・診断）

`scripts/doctor.sh` と `scripts/start.sh` は Host 設定を変えない。

- `doctor.sh`: Host Setup 完了後の読み取り専用診断（`setup.sh` からも readiness として呼ばれる。手動再実行は任意）
- beginner 起動: [Getting Started の Step 2](./getting-started.md#step-2-start-runtime) の `docker compose up -d`
- `start.sh`: Development / 上級者向けの起動補助（既定 `--build`。詳細は [scripts/README.md](../../scripts/README.md)）

`doctor.sh` / `start.sh` は `docker compose` プラグインを優先する。`docker-compose.sh` は standalone の `docker-compose` を入れる現行スクリプトである。完了確認は `docker compose version` を主とし、無ければ `docker-compose --version`。

## 前提 OS

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）
- Raspberry Pi OS 64-bit（Bookworm 想定。boot config は `/boot/firmware/config.txt`）
- **推奨環境: Raspberry Pi OS Lite 64-bit**
- Beginner / Runtime は Pi 3 B+ / 4 / 5 とも `./setups/setup.sh`（または上の手動 Runtime 標準順）。`swap.sh` の主用途は Pi 4 / Pi 5 の開発・Docker build。Pi 3 B+ は Runtime-only で build 用 swap は必須ではない。GPIO 確認の `gpiomem` パスは機種差あり
- Pi 3 B+ の基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan。code-server（Browser Editor）は必須ではない。Docker build は Unsupported（[Compatibility](../architecture/compatibility.md)）

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

CHIRIMEN Tutorial の SD イメージ書き込み、CHIRIMEN Lite、Pi Zero のセットアップは、このページの手順ではない。Host 構築はこのリポジトリの `setups/` を使う。GPIO / I2C の学習は [CHIRIMEN Tutorial](./chirimen-tutorial.md)。

## Raspberry Pi Setup の完了状態

次を満たせば Host 準備（Raspberry Pi Setup）は完了である。Runtime の起動はこのページでは行わない。完了後は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime)（`docker compose up -d`）へ進む。

- リポジトリを clone 済み
- `./setups/enable-i2c.sh --check` で `/dev/i2c-1` がある（または `./setups/setup.sh` が完了している）
- `./setups/disable-squeekboard.sh --check` を実行済み（Lite は `[info]` で変更なしでも完了）
- `docker --version` / `docker info` が通る（`docker.sh` 後の reboot 済み）
- `docker compose version` が通る（無ければ `docker-compose --version`）
- GPIO の host 確認（後述。`setups/*.sh` ではない）
- `sudo ./setups/swap.sh --check` は **Runtime 完了条件ではない**（Pi 4 / Pi 5 で Development / Docker build する場合のみ）

## リポジトリを clone する

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
```

以降の `setups/*.sh` は、clone したディレクトリで実行する。初心者は続けて `./setups/setup.sh` を実行する。

## 1. enable-i2c.sh

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

初心者が `./setups/setup.sh` 経由で I2C の reboot が必要なときは、案内どおり `sudo reboot` のあと **同じ `./setups/setup.sh` を再実行**する。

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

## 2. disable-squeekboard.sh

標準順の2番である。Raspberry Pi OS **Desktop**（Bookworm 以降・Wayland）では、テキスト欄にフォーカスするとスクリーンキーボード（Squeekboard）が出ることがある。物理キーボード付きで Browser Editor（`:8080`）や Catalog を使うときに Always Off にする。

**Lite が推奨環境である。** Lite にはスクリーンキーボードが無い。スクリプトは Desktop を検出しなければ設定を変えずに終了する。Lite でもこの手順を実行してよい。

```sh
sudo ./setups/disable-squeekboard.sh
./setups/disable-squeekboard.sh --check   # sudo 不要
```

`--check` は設定を変えず、現状だけ出す。sudo は不要。再実行しても設定を壊さない。反映は即時のことがある。残る場合は再ログインまたは reboot。I2C / Docker / swap の設定は変更しない。

手動:

- GUI: Control Centre → Display → On-screen keyboard → Disabled
- TUI: `sudo raspi-config` → Display Options → D6 Onscreen Keyboard → S3 Always Off

対象は Bookworm 以降の Squeekboard だけである。古い X11 の `onboard` / `matchbox-keyboard` は対象外。Lite や `do_squeekboard` が無い環境では設定を変えずに終了する。

## 3. docker.sh

I2C 確認のあと、host に Docker Engine を入れる。Runtime 操作は `docker compose up -d` / `down` のため Docker が必要である（正本は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime)）。Development / 上級者向けの `./scripts/start.sh` も Docker を使う。`docker.sh` は I2C 設定を変更しない。

```sh
./setups/docker.sh
```

`docker.sh` は `apt` の更新、get.docker.com によるインストール、`usermod -aG docker pi` を行う。**スクリプト末尾が必ず `sudo reboot` する。** reboot 後に手順 4 へ進む。再実行しても apt / インストーラのあと再び reboot する。

現行スクリプトのグループ追加先はユーザー `pi` である。ログイン名が `pi` でないときは、reboot 後に自分のユーザーを Docker グループへ追加する。

```sh
sudo usermod -aG docker "$USER"
```

新しいグループを使うには、一度ログアウトするか reboot する。

## 4. docker-compose.sh

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

`docker compose version` が無いときは `docker-compose --version`。daemon が動いていない場合は Docker を起動してから再度確認する。Host 全体の一括診断は `./scripts/doctor.sh` である（`setup.sh` 経由でも実行される。手動再確認は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime)）。

## GPIO

setup script のあと、host の GPIO device を確認する。この節は `setups/*.sh` ではない。**Host 側の完了確認**であり、CHIRIMEN Setup の `doctor.sh` ではない。

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

- **同一手順**: Runtime は `docker compose up -d`（モデルごとの compose 手編集は不要）。Development / 上級者向けの `./scripts/start.sh` は存在する device だけを渡す
- **`gpiomem`**: Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（無くても sysfs があればよい）
- **`gpiochip*`**: 存在すれば container にも渡る（backend は別 Issue）
- 機種別の実機検証結果は [Compatibility](../architecture/compatibility.md) を参照する。Raspberry Pi 3 A+ はスペック不足のため推奨環境外。Browser Development Flow の一連は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)

Compose 側の mount 方針は [docker.md](../architecture/docker.md) を参照。

## Development only: swap.sh

`swap.sh` の主用途は **Raspberry Pi 4 / Pi 5** での Source Development / Docker build 時の OOM 緩和である。**beginner / Runtime の標準順には含めない。** `setup.sh` からは呼ばない。`swap.sh` は I2C 設定を変更しない。

Docker build / `compose build` / `up --build` の対象機種は Pi 4 / Pi 5 のみである。手順は [Development](./development.md)。機種別の Supported / Unsupported は [Compatibility](../architecture/compatibility.md)。

**Pi 3 B+ は Runtime-only** である。`swap.sh` を Pi 3 B+ の on-device Docker build を有効にする手段としては案内しない（build は Unsupported。swap の有無とは別のサポートポリシー）。Runtime-only 利用では build 用 swap は必須ではない。低メモリ時の任意緩和として実行してよい。

Pi 3 B+ で成立させたい **基本体験** は次である。code-server（Browser Editor `:8080`）はここに含めない。

```text
Raspberry Pi 3 B+
        ↓
Raspberry Pi OS Lite 64-bit
        ↓
./setups/setup.sh（build / swap なし）
        ↓
docker compose up -d（または start.sh --no-build）
        ↓
CHIRIMEN Runtime + Example Catalog
        ↓
GPIO LED Blink / I2C Scan
```

```sh
df -h /
sudo ./setups/swap.sh
sudo ./setups/swap.sh --check
free -h
```

既定は 8G の `/swapfile`。サイズを変える例: `sudo ./setups/swap.sh --size 8G`。`/etc/fstab` にも追記するので reboot 後も有効。**reboot は不要**（即時有効）。

Pi 4 / Pi 5 で Docker build や開発中にメモリ不足・OOM が出る場合は `swap.sh` を実行する。CPU ファンは高負荷ビルド時の熱対策として任意だが推奨する。特定型番は指定しない。

### 既存 Swap を壊さない / 再実行

`swap.sh` が扱うのは **`/swapfile` だけ** である。Raspberry Pi OS 既定の `dphys-swapfile` / `/var/swap` や zram など、他の Swap は触らない・消さない。OS 既定 Swap が残っていると、合計は 8G + 既定分になりうる。

- 同一サイズ（±1MB）なら `swapoff` / 再作成しない。未有効なら `swapon` し、fstab 未記載なら追記する
- `--size` でサイズを変えたときだけ、既存 `/swapfile` を作り直す
- `--check` は `/swapfile` が active か見るだけで、設定は変えない

追加するだけで、既存の OS Swap を置き換えない。Runtime-only では必須ではない。

### ストレージ負荷

`/swapfile` はルートに約 8GB のファイルを置く。実行前に `df -h /` で空きを確認する。16GB の microSD では OS + Docker image + 8GB swap で逼迫しうる。

microSD への swap 書き込みは寿命と遅延の要因になる。可能なら容量に余裕のあるカード、または SSD / USB ブートを使う。

### Pi 3 B+ で必須としない高負荷機能

Pi 3 B+ の基本体験に **code-server（Browser Editor `:8080`）は含めない。** Catalog `:4200` と Example Server `:4173` で GPIO LED Blink / I2C Scan は成立する。

既定の `./scripts/start.sh` は Editor も起動する（この挙動は変えない）。メモリが厳しいときは起動後に止める。

```sh
docker compose stop chirimen-editor
```

Compose を直接使う場合の Runtime + Examples + Catalog は次である。

```sh
docker compose up chirimen-server chirimen-examples chirimen-example-catalog
```

OOM・熱・Editor の切り分けは [Troubleshooting](./troubleshooting.md)。短縮手順は [setups/README.md](../../setups/README.md)。

`docker.sh` の対象ユーザーは現行スクリプトどおり `pi` である。ログインユーザー名が違う環境でも `swap.sh` 自体は動く。Docker グループ追加の注意は手順 3 を参照する。

## 次の段階（Getting Started Step 2）

Raspberry Pi Setup が完了したら、このページでは起動コマンドを実行しない。beginner は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime) で `docker compose up -d` を実行し、`http://localhost:4200` を開く。`setup.sh` 経由なら readiness（`doctor.sh`）は済みである。手動で再確認したいときだけ `./scripts/doctor.sh`（[Runtime Diagnostics](./runtime-diagnostics.md)）。Development / device mapping / LAN が必要なときは [scripts/README.md](../../scripts/README.md) の `start.sh`。First Example は Step 3。

→ [Getting Started Step 2](./getting-started.md#step-2-start-runtime)

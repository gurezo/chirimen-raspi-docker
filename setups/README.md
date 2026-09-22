# setups

**Raspberry Pi Setup**（Host 構築）用の script。Raspberry Pi OS を CHIRIMEN Runtime が動く Host にする。起動（`start.sh`）はしない。推奨環境は Raspberry Pi OS Lite 64-bit。手順の正本は [Raspberry Pi Setup](../docs/guides/raspberry-pi-setup.md)。

## 導線の分離

```text
Beginner / Runtime
  ./setups/setup.sh
  docker compose up / down

Development / Build（Pi 4 / Pi 5 のみ）
  swap.sh
  docker build / compose build（[Development](../docs/guides/development.md)）
```

`swap.sh` と Docker build は **Development-only** である。beginner flow / `setup.sh` からは実行しない。**Pi 3 B+ は Runtime-only**（on-device build は Unsupported）。

## 初心者向け入口: setup.sh

初学者は個別 script を順に叩く代わりに、次を実行する。

```sh
./setups/setup.sh
```

`setup.sh` は状態を確認し、必要な既存 script（I2C / Squeekboard / Docker / Compose）だけを呼び出したうえで、`workspace/` の利用準備（存在・書き込み可否）と Runtime readiness（`scripts/doctor.sh`）を確認する orchestration script である。`swap.sh`・Docker build・`start.sh` は実行しない。Host に Node.js / pnpm / Nx は不要。完了後は `docker compose up -d` と `http://localhost:4200` を案内する。reboot が必要なら `sudo reboot` を案内して終了し、reboot 後に同じ `./setups/setup.sh` を再実行する（I2C の再開も同じ。単独実行時の `enable-i2c.sh --check` とは別導線）。

各 script の責務と呼び出し可否の正本は [Host setup script 棚卸し](../docs/guides/setup-host-script-audit.md) である。

## 手動で実行する場合の標準順（Runtime Host）

個別確認向け。初心者は上の `setup.sh` を使う（その場合、下記の `doctor.sh` も setup 経由で賄える）。`swap.sh` は含めない。

```text
1. enable-i2c.sh  → 必要なら reboot → --check
2. disable-squeekboard.sh
3. docker.sh      → スクリプトが reboot する
4. docker-compose.sh
      ↓
Raspberry Pi Setup 完了
      ↓
./scripts/doctor.sh（setup.sh 経由でも実行される）
      ↓
docker compose up -d（beginner）
  or ./scripts/start.sh（Pi 4 / Pi 5）
  or --no-build（Pi 3 B+ Runtime-only）
```

完了後の診断と起動は **CHIRIMEN Setup** である。機種別コマンドの正本は [Getting Started の Step 2](../docs/guides/getting-started.md#step-2-chirimen-setup)。`scripts/` の入口は [scripts/README.md](../scripts/README.md)。

`docker.sh` は I2C 設定を変更しない。host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発・on-device Docker build は [Development Guide](../docs/guides/development.md) を参照してください。

## 1. enable-i2c.sh

I2C Example と Runtime が `/dev/i2c-1` を使う。`/dev/i2c-1` が無いときは reboot が必要。既にあれば設定を触らない。

初心者は本 script を単独で叩かず `./setups/setup.sh` を使う。`setup.sh` 経由で I2C の reboot が必要なときは、案内どおり `sudo reboot` のあと **同じ `./setups/setup.sh` を再実行**する（下記の `--check` は手動・診断用）。

```sh
sudo ./setups/enable-i2c.sh
sudo reboot
./setups/enable-i2c.sh --check   # sudo 不要
```

`--check` は reboot 後に `/dev/i2c-1` を確認する。sudo は不要で、設定は変更しない。

## 2. disable-squeekboard.sh

標準順の2番。Desktop では Squeekboard を Always Off にする。**Lite では変更せず終わる**（実行してよい）。I2C / Docker / swap の設定は変更しない。

```sh
sudo ./setups/disable-squeekboard.sh
./setups/disable-squeekboard.sh --check   # sudo 不要
```

`--check` は設定を変えない。reboot は通常不要。残る場合は再ログインまたは reboot。

## 3. docker.sh

Docker Engine を入れる。I2C 設定は変更しない。**スクリプト末尾が必ず reboot する。** reboot 後に Compose を入れる。

```sh
./setups/docker.sh
```

現行スクリプトのグループ追加先はユーザー `pi` である。ログイン名が違うときは reboot 後に `sudo usermod -aG docker "$USER"`。

## 4. docker-compose.sh

`docker.sh` の reboot 後に実行する。`/usr/local/bin/docker-compose` を置く。完了確認は `docker compose version` を主とし、無ければ `docker-compose --version`。

```sh
./setups/docker-compose.sh
docker --version
docker compose version
```

## Development only: swap.sh

主用途は **Raspberry Pi 4 / Pi 5** での Source Development / Docker build 時の OOM 緩和である。**beginner / Runtime の標準順には含めない。** `setup.sh` からは呼ばない。I2C 設定は変更しない。reboot は不要（即時有効）。対象は `/swapfile` のみ。OS 既定 Swap（`dphys-swapfile` / `/var/swap` / zram）は触らない。

Docker build の対象機種は Pi 4 / Pi 5 のみ（[Compatibility](../docs/architecture/compatibility.md) / [Development](../docs/guides/development.md)）。**Pi 3 B+ は Runtime-only** であり、`swap.sh` を Pi 3 B+ build の有効化手段としては案内しない。Runtime-only では build 用 swap は必須ではない（低メモリ時の任意）。

```sh
df -h /                        # ルートに約 8GB の空きが必要
sudo ./setups/swap.sh          # 既定: 8G の /swapfile（同一サイズなら再実行しても作り直さない）
sudo ./setups/swap.sh --check  # 有効化の確認（設定は変えない）
free -h
```

サイズを変える例: `sudo ./setups/swap.sh --size 8G`。サイズが違うときだけ `/swapfile` を作り直す。`/etc/fstab` にも追記するので reboot 後も有効。

Pi 4 / Pi 5 で Docker build や開発中にメモリ不足・OOM が出る場合に実行する。CPU ファンは高負荷ビルド時の熱対策として任意だが推奨する。

16GB microSD では OS + Docker image + 8GB swap で逼迫しうる。swap 書き込みは寿命と遅延の要因になる。

Pi 3 B+ の基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan。code-server（Browser Editor）は必須ではない。メモリが厳しいときは `docker compose stop chirimen-editor`。

詳細は [Raspberry Pi Setup の swap.sh](../docs/guides/raspberry-pi-setup.md#development-only-swapsh)。

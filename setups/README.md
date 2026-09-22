# setups

**Raspberry Pi Setup**（Host 構築）用の script。Raspberry Pi OS を CHIRIMEN Runtime が動く Host にする。Runtime の診断（`doctor.sh`）と起動（`start.sh`）はしない。推奨環境は Raspberry Pi OS Lite 64-bit。上から順に実行する。手順の正本は [Raspberry Pi Setup](../docs/guides/raspberry-pi-setup.md)。

```text
1. swap.sh
2. enable-i2c.sh  → 必要なら reboot → --check
3. disable-squeekboard.sh
4. docker.sh      → スクリプトが reboot する
5. docker-compose.sh
      ↓
Raspberry Pi Setup 完了
      ↓
./scripts/doctor.sh
      ↓
./scripts/start.sh（Pi 4 / Pi 5）
  or --no-build（Pi 3 B+ Runtime-only）
```

完了後の診断と起動は **CHIRIMEN Setup** である。機種別コマンドの正本は [Getting Started の Step 2](../docs/guides/getting-started.md#step-2-chirimen-setup)。`scripts/` の入口は [scripts/README.md](../scripts/README.md)。

`docker.sh` は I2C 設定を変更しない。host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発は [Development Guide](../docs/guides/development.md) を参照してください。

## 1. swap.sh

主用途は **Raspberry Pi 4 / Pi 5** での Source Development / Docker build 時の OOM 緩和である。標準順では実行してよい。I2C 設定は変更しない。reboot は不要（即時有効）。対象は `/swapfile` のみ。OS 既定 Swap（`dphys-swapfile` / `/var/swap` / zram）は触らない。

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

詳細は [Raspberry Pi Setup の swap.sh](../docs/guides/raspberry-pi-setup.md#1-swapsh)。

## 2. enable-i2c.sh

I2C Example と Runtime が `/dev/i2c-1` を使う。`/dev/i2c-1` が無いときは reboot が必要。既にあれば設定を触らない。

```sh
sudo ./setups/enable-i2c.sh
sudo reboot
./setups/enable-i2c.sh --check   # sudo 不要
```

`--check` は reboot 後に `/dev/i2c-1` を確認する。sudo は不要で、設定は変更しない。

## 3. disable-squeekboard.sh

標準順の3番。Desktop では Squeekboard を Always Off にする。**Lite では変更せず終わる**（実行してよい）。I2C / Docker / swap の設定は変更しない。

```sh
sudo ./setups/disable-squeekboard.sh
./setups/disable-squeekboard.sh --check   # sudo 不要
```

`--check` は設定を変えない。reboot は通常不要。残る場合は再ログインまたは reboot。

## 4. docker.sh

Docker Engine を入れる。I2C 設定は変更しない。**スクリプト末尾が必ず reboot する。** reboot 後に Compose を入れる。

```sh
./setups/docker.sh
```

現行スクリプトのグループ追加先はユーザー `pi` である。ログイン名が違うときは reboot 後に `sudo usermod -aG docker "$USER"`。

## 5. docker-compose.sh

`docker.sh` の reboot 後に実行する。`/usr/local/bin/docker-compose` を置く。完了確認は `docker compose version` を主とし、無ければ `docker-compose --version`。

```sh
./setups/docker-compose.sh
docker --version
docker compose version
```

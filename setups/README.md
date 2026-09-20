# setups

Raspberry Pi OS を CHIRIMEN Runtime が動く Host にするための script。標準 OS は Raspberry Pi OS Lite 64-bit。上から順に実行する。手順の正本は [Raspberry Pi Setup](../docs/guides/raspberry-pi-setup.md)。

```text
1. swap.sh
2. enable-i2c.sh  → 必要なら reboot → --check
3. disable-squeekboard.sh
4. docker.sh      → スクリプトが reboot する
5. docker-compose.sh
```

`docker.sh` は I2C 設定を変更しない。host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発は [Development Guide](../docs/guides/development.md) を参照してください。

## 1. swap.sh

Docker image ビルド前に swap を確保する。Pi 3 B+（RAM 1GB。サポート対象の下限）では必須。Pi 4 / 5 でも同じコマンドでよい。I2C 設定は変更しない。reboot は不要（即時有効）。対象は `/swapfile` のみ。OS 既定 Swap（`dphys-swapfile` / `/var/swap` / zram）は触らない。

```sh
df -h /                        # ルートに約 8GB の空きが必要
sudo ./setups/swap.sh          # 既定: 8G の /swapfile（同一サイズなら再実行しても作り直さない）
sudo ./setups/swap.sh --check  # 有効化の確認（設定は変えない）
free -h
```

サイズを変える例: `sudo ./setups/swap.sh --size 8G`。サイズが違うときだけ `/swapfile` を作り直す。`/etc/fstab` にも追記するので reboot 後も有効。

Raspberry Pi 3 B+（1GB）でビルドするときは、次の **両方** が必須である。片方だけでは足りない。

- **8GB swap**: 無いと Docker image をビルドできない
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止 / ハング）を防ぐために **必ず実装する**。特定メーカー / 型番は指定しない。電源投入前に装着する

16GB microSD では OS + Docker image + 8GB swap で逼迫しうる。swap 書き込みは寿命と遅延の要因になる。

Pi 3 B+ の基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan。code-server（Browser Editor）は必須ではない。メモリが厳しいときは `docker compose stop chirimen-editor`。

Pi 4 / 5 の swap / ファンは任意。メモリ不足や OOM が出る場合も `swap.sh` を提案する。詳細は [Raspberry Pi Setup の swap.sh](../docs/guides/raspberry-pi-setup.md#1-swapsh)。

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

# setups

Raspberry Pi host の Docker / Docker Compose / swap 環境構築。

Docker の前に [Raspberry Pi setup](../docs/guides/raspberry-pi-setup.md) の I2C（`scripts/enable-i2c.sh`）を完了する。`docker.sh` は I2C 設定を変更しない。低スペック機では `swap.sh` で swap を確保する。

host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発は [Development Guide](../docs/guides/development.md) を参照してください。

## Docker

```sh
./setups/docker.sh
```

`docker.sh` はインストール完了後に reboot する。reboot 後に Compose を入れる。

```sh
./setups/docker-compose.sh
```

## 低スペック機の swap（swap.sh）

RAM が少ないホスト（1GB 級。代表は Raspberry Pi 3 B+）では、Docker image ビルド前に `setups/swap.sh` で swap を確保する。`swap.sh` は I2C 設定を変更しない。

```sh
sudo ./setups/swap.sh          # 既定: 8G の /swapfile（idempotent）
sudo ./setups/swap.sh --check  # 有効化の確認
free -h
```

サイズを変える例: `sudo ./setups/swap.sh --size 8G`。`/etc/fstab` にも追記するので reboot 後も有効。Docker / `./scripts/start.sh` の**前**に実行する。

Raspberry Pi 3 B+（1GB）でビルドするときは、次の **両方** が必須である。片方だけでは足りない。

- **8GB swap**: 無いと Docker image をビルドできない
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止 / ハング）を防ぐために **必ず実装する**。特定メーカー / 型番は指定しない。電源投入前に装着する

Pi 4 / 5 の swap / ファンは任意。メモリ不足や OOM が出る場合も `swap.sh` を提案する。

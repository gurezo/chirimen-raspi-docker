# setups

Raspberry Pi host の Docker / Docker Compose / swap 環境構築。

host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発は [Development Guide](../docs/guides/development.md) を参照してください。

## Docker

```sh
./setups/docker.sh
```

`docker.sh` はインストール完了後に reboot する。reboot 後に Compose を入れる。

```sh
./setups/docker-compose.sh
```

## Pi 3 B+ のビルド前提（8GB swap と CPU ファン）

Raspberry Pi 3 B+（1GB）で Docker image をビルドするときは、次の **両方** が必須である。片方だけでは足りない。

- **8GB swap**: 無いと Docker image をビルドできない
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止 / ハング）を防ぐために **必ず実装する**。特定メーカー / 型番は指定しない

Pi 4 / 5 の swap / ファンは任意。

```sh
sudo ./setups/swap.sh          # 既定: 8G の /swapfile（idempotent）
sudo ./setups/swap.sh --check  # 有効化の確認
free -h
```

サイズを変える例: `sudo ./setups/swap.sh --size 8G`。`/etc/fstab` にも追記するので reboot 後も有効。CPU ファンは電源投入前に装着する。Docker / `./scripts/start.sh` の**前**に実行する。

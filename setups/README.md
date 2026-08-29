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

## Swap（低メモリ機向け）

Pi 3 B+（1GB）などでは、Docker image build（`pnpm install` / `pnpm nx build`）の前に swap を有効化すると OOM を避けやすい。

```sh
sudo ./setups/swap.sh          # 既定: 4G の /swapfile（idempotent）
sudo ./setups/swap.sh --check  # 有効化の確認
free -h
```

サイズを変える例: `sudo ./setups/swap.sh --size 4G`。`/etc/fstab` にも追記するので reboot 後も有効。Docker / `./scripts/start.sh` の**前**に実行する。

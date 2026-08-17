# setups

Raspberry Pi host の Docker / Docker Compose 環境構築。

host の Node.js / pnpm / Nx は Runtime には不要です。リポジトリ開発は [Development Guide](../docs/guides/development.md) を参照してください。

## Docker

```sh
./setups/docker.sh
```

`docker.sh` はインストール完了後に reboot する。reboot 後に Compose を入れる。

```sh
./setups/docker-compose.sh
```

# Getting Started

初めての利用者が、Raspberry Pi 上で CHIRIMEN Runtime を起動するまでの最短手順。

関連:

- [Raspberry Pi setup](./raspberry-pi-setup.md)（host の事前準備がまだの場合）
- [Troubleshooting](./troubleshooting.md)
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- Raspberry Pi 3 / 4 / 5
- **64-bit** Raspberry Pi OS（公開 image は `linux/arm64` のみ）
- Docker と Docker Compose が利用できること
- GPIO / I2C 用 device が host に存在すること（詳細は [raspberry-pi-setup.md](./raspberry-pi-setup.md)）

開発マシン単体（macOS など）では `docker compose up` が device 欠如で失敗することがある。その場合は [troubleshooting.md](./troubleshooting.md) の「非 Pi 環境」を参照。

## 最短: GHCR image を pull して起動する

リポジトリを clone せず、公開 image だけ使う場合:

```sh
docker pull ghcr.io/gurezo/chirimen-raspi-docker/server:latest
```

Compose で device mount まで含めて起動するには、リポジトリの [`compose.yaml`](../../compose.yaml) が必要です（次節）。`compose.yaml` がある環境では:

```sh
docker compose up
```

server は default で `33330` 番 port を使用する。health check は「4. health check で確認する」を参照。

## 1. リポジトリを clone する

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
```

## 2. host を診断する

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`[error]` が無ければ次へ進む。I2C や GPIO の不足が出た場合は [raspberry-pi-setup.md](./raspberry-pi-setup.md) を先に完了する。`uname -m` が `aarch64` であることを確認する（`armv7l` の 32-bit OS では GHCR image を使えない）。

## 3. Runtime を起動する

GHCR の公開 image を利用（推奨）:

```sh
docker compose up
```

ローカルで Dockerfile から再構築する場合:

```sh
docker compose up --build
```

server は default で `33330` 番 port を使用する。

## 4. health check で確認する

別ターミナルで:

```sh
curl http://localhost:33330/health
```

期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```

container 内で device が見えることの確認例:

```sh
docker compose exec chirimen-server ls -l /dev/gpiomem /dev/i2c-1 /sys/class/gpio
```

## 次のステップ

| やりたいこと | 参照 |
| --- | --- |
| Pi の I2C / GPIO / Docker を整える | [raspberry-pi-setup.md](./raspberry-pi-setup.md) |
| 起動失敗・Permission denied など | [troubleshooting.md](./troubleshooting.md) |
| 設計・依存境界を読む | [Architecture overview](../architecture/overview.md) |
| Protocol / wire format | [protocol.md](../architecture/protocol.md) |
| 公開 API リファレンス | [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/)（ローカルは `pnpm docs:api`） |

ローカルで TypeScript を触る場合（Docker 以外）:

```sh
pnpm install
npx nx build server
npx nx serve server
```

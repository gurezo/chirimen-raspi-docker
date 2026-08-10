# Getting Started

初めての利用者が、Raspberry Pi 上で CHIRIMEN Runtime を起動するまでの最短手順。

関連:

- [Raspberry Pi setup](./raspberry-pi-setup.md)（host の事前準備がまだの場合）
- [Troubleshooting](./troubleshooting.md)
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- Raspberry Pi 3 / 4 / 5
- Raspberry Pi OS
- Docker と Docker Compose が利用できること
- GPIO / I2C 用 device が host に存在すること（詳細は [raspberry-pi-setup.md](./raspberry-pi-setup.md)）

開発マシン単体（macOS など）では GPIO / I2C device が無いことがある。`./scripts/start.sh` は存在する path だけを渡して起動を試みるが、実機機能の検証は Raspberry Pi 上で行う。詳細は [troubleshooting.md](./troubleshooting.md) の「非 Pi 環境」を参照。

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

`[error]` が無ければ次へ進む。I2C や GPIO の不足が出た場合は [raspberry-pi-setup.md](./raspberry-pi-setup.md) を先に完了する。

## 3. Runtime を起動する

```sh
chmod +x scripts/start.sh
./scripts/start.sh
```

`start.sh` は host の hardware path を探査し、存在する device だけを Compose に渡す（Pi 3 / 4 / 5 で同一手順）。server は default で `33330` 番 port を使用する。

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

container 内で sysfs / device が見えることの確認例:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* /dev/i2c-1 2>/dev/null || true
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

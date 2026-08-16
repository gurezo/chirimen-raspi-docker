# Getting Started

初めての利用者が、Raspberry Pi 上で CHIRIMEN Runtime を起動するまでの最短手順。

関連:

- [Raspberry Pi setup](./raspberry-pi-setup.md)（host の事前準備がまだの場合）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility matrix](../architecture/docker.md#compatibility-matrix)）
- Raspbian OS 64-bit、または Pi 3 B+ / Pi 4 / Pi 5 の Raspbian OS 32-bit（32-bit は Node 22 / `Dockerfile.32bit`。Pi 4 / Pi 5 の 32-bit OS は 64-bit kernel が default のため `uname -m` は `aarch64`。32-bit の検証済み機種は Pi 4 Model B Rev 1.4 と Pi 5 Model B Rev 1.0。詳細は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）
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
./scripts/start.sh          # uname -m で 32-bit / 64-bit 用 Dockerfile を自動選択
./scripts/start.sh --32bit  # 32-bit OS（Node 22）
./scripts/start.sh --64bit  # 64-bit OS（Node 24）
```

`start.sh` は host の hardware path を探査し、存在する device だけを Compose に渡す（Pi 3 / 4 / 5 で同一手順）。server は default で `33330` 番 port を使用する。32-bit OS では Node 24 image に `linux/arm/v7` が無いため、`--32bit`（または自動選択）で `docker/server/Dockerfile.32bit` を使う。Pi 4 / Pi 5 の 32-bit OS は `uname -m` が `aarch64` のため自動選択は 64-bit 用 Dockerfile になりうる。32-bit userland 向け image が必要な場合は `./scripts/start.sh --32bit` を明示する。

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
| LED を点滅させる | [gpio-led-blink.md](./gpio-led-blink.md)。HTML サンプル（`docs/examples/led-blink/`）または web-demo の GPIO Output。配線は [回路仕様](../examples/gpio-led-blink.md) |
| タクトスイッチの入力を確認する | [gpio-input.md](./gpio-input.md)。HTML サンプル（`docs/examples/button/`）または web-demo の GPIO Input。配線は [回路仕様](../examples/gpio-input.md) |
| I2C bus の address を scan する | [i2c-scan.md](./i2c-scan.md)。web-demo の I2C Scan（`#/i2c-scan`）。検証用 slave は ADT7410（`0x48`）。配線は [検証仕様](../examples/i2c-scan.md) |
| Browser から Runtime を試す（web-demo） | `pnpm nx serve web-demo` で接続状態と GPIO Output / GPIO Input / I2C Scan を確認する。[browser-polyfill.md](./browser-polyfill.md) |
| 旧 `polyfill.js` 相当の script 読み込み | [browser-polyfill.md](./browser-polyfill.md) |
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

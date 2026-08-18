# Getting Started

初めての利用者が、Raspberry Pi 上で CHIRIMEN Runtime を起動するまでの最短手順。

関連:

- [Raspberry Pi setup](./raspberry-pi-setup.md)（host の事前準備がまだの場合）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility matrix](../architecture/docker.md#compatibility-matrix)）
- Raspbian OS 64-bit
- 32-bit OS はサポート対象外
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
./scripts/start.sh            # Runtime only
./scripts/start.sh --editor   # Runtime + Browser Editor
```

`start.sh` は host の hardware path を探査し、存在する device だけを Compose に渡す（Pi 3 / 4 / 5 で同一手順）。server は default で `33330` 番 port を使用する。既定は Runtime only である。Browser Editor は `./scripts/start.sh --editor`（または `docker compose --profile editor up`）で追加起動する。

## 4. health check で確認する

別ターミナルで:

```sh
curl http://localhost:33330/health
```

server の期待する応答例:

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

## 5. （任意）Browser Editor を起動する

Editor も使う場合:

```sh
./scripts/start.sh --editor
curl -fsS http://127.0.0.1:8080/healthz
```

Compose を直接使う場合は `docker compose --profile editor up`（`COMPOSE_PROFILES=editor` でも可）。

Browser で `http://127.0.0.1:8080` を開く。初回 password は named volume `chirimen-editor-config` の `config.yaml` にある。`docker compose down`（`-v` なし）のあと再作成しても同じ password と extension が残る。`docker compose down -v` は設定・拡張を消す。Example の編集は host の `docs/examples`（bind mount）に残る。`/healthz` は `expired` でも HTTP 200 ならプロセスは生存している。

workspace は `led-blink/` / `button/` / `i2c-scan/` である。Terminal → Run Task → **Serve examples** で静的サーバを起動し、別タブで次を開く。

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

保存後は Example タブを reload する（hot reload は無い）。`pnpm` / `nx` は Editor では使わない。配置の正本は [docs/examples/README.md](../examples/README.md)。方針は [browser-editor.md の Example 編集](../architecture/browser-editor.md#example-編集--静的-serve179)。

HTML / CSS は code-server 内蔵のため追加インストールは不要。Prettier / ESLint / Japanese Language Pack は Extensions ビューの推奨から Open VSX で入れる（image へはプリインストールしない）。日本語 UI にする場合は、Language Pack 導入後に Command Palette の Display Language で `ja` へ切り替える。利用ガイドは [#183](https://github.com/gurezo/chirimen-raspi-docker/issues/183)。方針は [browser-editor.md の Extension](../architecture/browser-editor.md#extension)。

```sh
docker compose --profile editor exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
```

## 次のステップ

| やりたいこと | 参照 |
| --- | --- |
| Pi の I2C / GPIO / Docker を整える | [raspberry-pi-setup.md](./raspberry-pi-setup.md) |
| LED を点滅させる | [gpio-led-blink.md](./gpio-led-blink.md)。HTML サンプル（`docs/examples/led-blink/`）または web-demo の GPIO Output。配線は [回路仕様](../examples/gpio-led-blink.md) |
| タクトスイッチの入力を確認する | [gpio-input.md](./gpio-input.md)。HTML サンプル（`docs/examples/button/`）または web-demo の GPIO Input。配線は [回路仕様](../examples/gpio-input.md) |
| I2C bus の address を scan する | [i2c-scan.md](./i2c-scan.md)。HTML サンプル（`docs/examples/i2c-scan/`）または web-demo の I2C Scan（`#/i2c-scan`）。検証用 slave は ADT7410（`0x48`）。配線は [検証仕様](../examples/i2c-scan.md) |
| Browser から Runtime を試す（web-demo） | `pnpm nx serve web-demo` で接続状態と GPIO Output / GPIO Input / I2C Scan を確認する。[browser-polyfill.md](./browser-polyfill.md) |
| 旧 `polyfill.js` 相当の script 読み込み | [browser-polyfill.md](./browser-polyfill.md) |
| 起動失敗・Permission denied など | [troubleshooting.md](./troubleshooting.md) |
| Browser Editor を追加起動する | 上記「5. （任意）Browser Editor を起動する」。`./scripts/start.sh --editor` |
| Browser Editor から Example を編集・実行する | 上記「5. （任意）Browser Editor を起動する」。Run Task **Serve examples** → `http://127.0.0.1:4173/...` |
| Browser Editor の workspace / 設定の永続化 | [browser-editor.md](../architecture/browser-editor.md#workspace-volume) |
| Browser Editor の推奨 extension | [browser-editor.md の Extension](../architecture/browser-editor.md#extension)。Prettier / ESLint / 日本語パック |
| 設計・依存境界を読む | [Architecture overview](../architecture/overview.md) |
| Protocol / wire format | [protocol.md](../architecture/protocol.md) |
| 公開 API リファレンス | [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/)（ローカルは `pnpm docs:api`） |

ローカルで TypeScript を触る場合（Docker 以外）は [Development Guide](./development.md) を参照してください。

```sh
pnpm install
npx nx build server
npx nx serve server
```

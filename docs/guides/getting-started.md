# Getting Started

clone と [Raspberry Pi Setup](./raspberry-pi-setup.md) を終えた利用者が、Raspberry Pi 上で CHIRIMEN Runtime を起動するまでの最短手順。

推奨順:

```text
Raspberry Pi Setup（clone / I2C / Docker / 低スペックなら swap / doctor） → このページ（起動）
```

関連:

- [Raspberry Pi Setup](./raspberry-pi-setup.md)（clone と host 準備。このページの前）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / JavaScript / 回路を学ぶ）
- [Browser Development Environment](./browser-development.md)（Editor から Example を編集・実行する）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Runtime Diagnostics](./runtime-diagnostics.md)（doctor.sh / `/health` / Reference Examples）
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- リポジトリを clone 済みであること
- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）
- Raspberry Pi OS 64-bit
- Recommended: Raspberry Pi OS Lite 64-bit
- Docker と Docker Compose が利用できること
- GPIO / I2C 用 device が host に存在すること
- 低スペック機（1GB 級。代表は Raspberry Pi 3 B+）ではビルド前に `sudo ./setups/swap.sh` で swap を確保する。Pi 3 B+ は **8GB swap と CPU ファンの両方** が必須（詳細は [Raspberry Pi Setup](./raspberry-pi-setup.md)）

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

clone や I2C / Docker / swap / GPIO の準備がまだなら、先に [Raspberry Pi Setup](./raspberry-pi-setup.md) を完了する。

開発マシン単体（macOS など）では GPIO / I2C device が無いことがある。`./scripts/start.sh` は存在する path だけを渡して起動を試みるが、実機機能の検証は Raspberry Pi 上で行う。詳細は [Troubleshooting](./troubleshooting.md) の「非 Pi 環境」を参照。

## 1. host を診断する

clone したディレクトリで:

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`[error]` が無ければ次へ進む。I2C や GPIO の不足が出た場合は [Raspberry Pi Setup](./raspberry-pi-setup.md) を先に完了する。

## 2. Runtime と Editor を起動する

```sh
chmod +x scripts/start.sh
./scripts/start.sh            # Runtime + Browser Editor + Examples + Catalog
./scripts/start.sh --lan      # 同上。Editor / Example / Catalog を LAN 公開
./scripts/start.sh --32bit    # Runtime only（32-bit OS。サポート対象外）
```

`start.sh` は host の hardware path を探査し、存在する device だけを Compose に渡す（Pi 3 / 4 / 5 で同一手順）。I2C 設定は変更しない。server は default で `33330` 番 port を使用する。既定は 64-bit の全サーバー起動である。Compose を直接使う場合は `docker compose up`。32-bit OS は `--32bit` で Runtime only になる。

64-bit の初回対話起動では Browser Editor の password を決める。覚えておける文字列を 2 回入力する。gitignored の `.env` に `CHIRIMEN_EDITOR_PASSWORD` として書かれ、ログには平文を出さない。CI や TTY が無いとき、または既に password があるときは prompt しない。`.env` は Git に含めない。`auth: none` は使わない。LAN（`--lan`）でも password は必須である。

## 3. health check で確認する

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

I2C → Docker → Runtime のあと、`chirimen-server` から `/dev/i2c-1` が見えることは Raspberry Pi 5 で [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219) が確認済み。詳細は [Compatibility](../architecture/compatibility.md) の「I2C Host Setup → Docker Runtime 実機検証」。

## 4. Browser で Editor / Examples を開く

`Learn → Edit → Save → Run → Verify` の正本は [Browser Development Environment](./browser-development.md)。実機 E2E は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）。

```sh
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

| Port | Service | Role |
| --- | --- | --- |
| 33330 | chirimen-server | Hardware Runtime / WebSocket |
| 8080 | chirimen-editor | code-server / Edit |
| 4173 | chirimen-examples | Edited Example execution |
| 4200 | chirimen-example-catalog | Example Catalog（Web UI 入口） |

Browser で `:8080` を開いたら、セットアップ（初回 `./scripts/start.sh`）で決めた password を入れる。`docker compose exec` で `config.yaml` を読む必要はない。忘れたときの退避は [Troubleshooting](./troubleshooting.md#editor-にログインできない--password-を忘れた)。

確認先は Example Server `:4173` である。Catalog（`:4200`）は題材の発見入口である。ported の「実行」は `:4173`、「編集」は Editor の既存 workspace ルートを開く。Compose を uid なしで直接使うと保存時に Permission denied になることがある。

## 次のステップ

| やりたいこと | 参照 |
| --- | --- |
| GPIO / I2C / JavaScript / 回路を学ぶ | [CHIRIMEN Tutorial](./chirimen-tutorial.md)。環境構築は Tutorial ではなくこのページと [Raspberry Pi Setup](./raspberry-pi-setup.md) |
| LED を点滅させる | [GPIO LED Blink](./gpio-led-blink.md)。HTML サンプル（`http://127.0.0.1:4173/led-blink/`）。配線は [回路仕様](../examples/gpio-led-blink.md) |
| Example を探す（Catalog） | `http://127.0.0.1:4200/`。ported は「実行」と「編集」。手順は [Browser Development Environment](./browser-development.md#catalog-で題材を探す)。出典・責務は [catalog.md](../examples/catalog.md)。metadata は [catalog-metadata.md](../examples/catalog-metadata.md) |
| タクトスイッチの入力を確認する | [GPIO Input](./gpio-input.md)。HTML サンプル（`http://127.0.0.1:4173/button/`）。配線は [回路仕様](../examples/gpio-input.md) |
| I2C bus の address を scan する | [I2C Scan](./i2c-scan.md)。HTML サンプル（`http://127.0.0.1:4173/i2c-scan/`）。検証用 slave は ADT7410（`0x48`）。配線は [検証仕様](../examples/i2c-scan.md) |
| Runtime の疎通を確認する | [Runtime Diagnostics](./runtime-diagnostics.md)。Host は `doctor.sh`、Server は `GET /health`、Browser は GPIO LED Blink / GPIO Input / I2C Scan |
| 旧 `polyfill.js` 相当の script 読み込み | [browser-polyfill.md](./browser-polyfill.md) |
| 起動失敗・Permission denied など | [Troubleshooting](./troubleshooting.md#browser-development-の切り分け) |
| Browser Editor から Example を編集・実行する | [Browser Development Environment](./browser-development.md) |
| Browser Development Flow の実機 E2E | [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（#243）。手順は [browser-development.md](./browser-development.md#実機-e2e-検証243) |
| Runtime を診断する | [Runtime Diagnostics](./runtime-diagnostics.md) |
| Browser Editor の workspace / 設定の永続化 | [browser-development.md](./browser-development.md#停止-バックアップ)。方針は [browser-editor.md](../architecture/browser-editor.md#workspace-volume) |
| Browser Editor を LAN から開く | `./scripts/start.sh --lan`。[browser-development.md](./browser-development.md#editor-を開く)。Internet 公開はしない |
| Browser Editor の Extension | [browser-development.md](./browser-development.md#editor-を開く)。プリインストール・推奨しない |
| 設計・依存境界を読む | [Architecture overview](../architecture/overview.md) |
| Protocol / wire format | [protocol.md](../architecture/protocol.md) |
| 公開 API リファレンス | [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/)（ローカルは `pnpm docs:api`） |

ローカルで TypeScript を触る場合（Docker 以外）は [Development Guide](./development.md) を参照してください。

```sh
pnpm install
npx nx build server
npx nx serve server
```

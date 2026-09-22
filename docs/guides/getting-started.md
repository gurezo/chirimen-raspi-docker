# Getting Started

初めて使う人が次に何をすればよいか迷わないための3段階。Host を構築し、Runtime を起動し、最初の Example まで進む。

```text
Getting Started
├─ Step 1: Raspberry Pi Setup
│    ├─ Swap
│    ├─ I2C
│    ├─ Squeekboard
│    ├─ Docker
│    └─ Docker Compose
├─ Step 2: CHIRIMEN Setup
│    ├─ doctor.sh
│    └─ start.sh
└─ Step 3: Run Your First Example
     ├─ Example Catalog
     └─ GPIO LED Blink
```

Step 2 のあとの利用フローは [Browser Development Environment](./browser-development.md) と同じである。編集先は host `workspace/`。Editor は Step 3 の完了条件ではない。

```text
Setup → doctor.sh → start.sh
  ↓
Example Catalog :4200
  ├─ 実行 → Example Server :4173
  └─ 編集 → Browser Editor :8080 → workspace/ → Save → :4173
                                      ↓
                               Browser Polyfill
                                      ↓
                            chirimen-server :33330
```

`setups/` は Host 構築、`scripts/` は診断と Runtime 起動。役割の入口は [setups/README.md](../../setups/README.md) と [scripts/README.md](../../scripts/README.md)。Host 構築の詳細正本は [Raspberry Pi Setup](./raspberry-pi-setup.md)。

関連:

- 親 Issue: [#304 Raspberry Pi 3 B+ を Runtime-only とし Docker build を Pi 4 / Pi 5 に限定する](https://github.com/gurezo/chirimen-raspi-docker/issues/304)
- 子 Issue: [#306 Getting Started から Raspberry Pi 3 B+ の Docker build 導線を除外する](https://github.com/gurezo/chirimen-raspi-docker/issues/306)
- 実機検証: [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) / [Pi 3 B+ の build 非推奨コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)
- [Compatibility](../architecture/compatibility.md)（[Runtime Support](../architecture/compatibility.md#runtime-support) / [Development / Docker Build Support](../architecture/compatibility.md#development--docker-build-support)）
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Step 1 の詳細正本。Host 構築）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / JavaScript / 回路を学ぶ）
- [Browser Development Environment](./browser-development.md)（Editor から Example を編集・実行する。任意）
- [Development](./development.md)（リポジトリをホスト上で開発する場合）
- [GPIO LED Blink](./gpio-led-blink.md)（Step 3 の詳細正本）
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [Troubleshooting](./troubleshooting.md)
- [Runtime Diagnostics](./runtime-diagnostics.md)（doctor.sh / `/health` / Reference Examples）
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)

## 前提

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）
- サポート対象は Raspberry Pi OS 64-bit
- Recommended: Raspberry Pi OS Lite 64-bit
- モデル別ロール（正本は [Compatibility](../architecture/compatibility.md)）:
  - **Raspberry Pi 3 B+**: **Runtime-only**（`docker compose up` / `down`）。`docker build` / `compose build` / `up --build` および `./scripts/start.sh` 既定の自動 `--build` は Unsupported
  - **Raspberry Pi 4 / Pi 5**: Runtime / Development（Docker build Supported）
- Getting Started は GHCR / Prebuilt image を前提にしない。Pi 3 B+ では on-device の Docker build を案内しない
- Pi 3 B+ の基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan。code-server（Browser Editor `:8080`）は必須ではない。メモリが厳しいときは起動後に `docker compose stop chirimen-editor`。低メモリ時の Swap は [Raspberry Pi Setup の swap.sh](./raspberry-pi-setup.md#1-swapsh)

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

clone や swap / I2C / Docker / GPIO の準備は [Step 1](#step-1-raspberry-pi-setup) で行う。開発マシン単体（macOS など）では GPIO / I2C device が無いことがある。`./scripts/start.sh` は存在する path だけを渡して起動を試みるが、実機機能の検証は Raspberry Pi 上で行う。詳細は [Troubleshooting](./troubleshooting.md) の「非 Pi 環境」を参照。

## Step 1: Raspberry Pi Setup

Raspberry Pi OS を CHIRIMEN Runtime が動く Host にする。

### 目的

`setups/*.sh` で Host を整える。Runtime の診断（`doctor.sh`）と起動（`start.sh`）はこの Step では行わない。

### 実行コマンド

詳細・reboot の要否・再実行時の安全性は [Raspberry Pi Setup](./raspberry-pi-setup.md) が正本である。標準順:

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
sudo ./setups/swap.sh
sudo ./setups/enable-i2c.sh
sudo ./setups/disable-squeekboard.sh
./setups/docker.sh
./setups/docker-compose.sh
```

| 順 | Script | 役割 |
| --- | --- | --- |
| 1 | `swap.sh` | Docker image ビルド前の Swap。Pi 3 B+ では必須 |
| 2 | `enable-i2c.sh` | `/dev/i2c-1` を使えるようにする。無いときは reboot 後に `--check` |
| 3 | `disable-squeekboard.sh` | Desktop のスクリーンキーボードを Off。Lite では変更せず終わる |
| 4 | `docker.sh` | Docker Engine。スクリプト末尾が reboot する |
| 5 | `docker-compose.sh` | Compose。`docker.sh` の reboot 後に実行する |

GPIO の host 確認も Step 1 の完了に含む。手順は [Raspberry Pi Setup の GPIO](./raspberry-pi-setup.md#gpio)。

### 実行する理由

CHIRIMEN Runtime は Docker Compose で動き、GPIO / I2C は Host の device を使う。Host が揃っていないと Step 2 の `doctor.sh` が `[error]` になる。

### 完了確認

次を満たせば Step 1 は完了である。チェック項目の正本は [Raspberry Pi Setup の完了状態](./raspberry-pi-setup.md#raspberry-pi-setup-の完了状態)。

- リポジトリを clone 済み
- `sudo ./setups/swap.sh --check` が通る
- `./setups/enable-i2c.sh --check` で `/dev/i2c-1` がある
- `./setups/disable-squeekboard.sh --check` を実行済み（Lite は変更なしでも完了）
- `docker --version` / `docker compose version` が通る（無ければ `docker-compose --version`）
- GPIO の host 確認（`/sys/class/gpio`）

### 次の Step

→ [Step 2: CHIRIMEN Setup](#step-2-chirimen-setup)

### 失敗時

Host 側の不足である。[Raspberry Pi Setup](./raspberry-pi-setup.md) の該当スクリプト節と、[Troubleshooting](./troubleshooting.md) の Host 切り分けを見る。`doctor.sh` / `start.sh` で Host 設定は変えない。

## Step 2: CHIRIMEN Setup

Host 上で Runtime を診断し、起動する。I2C / swap / Docker のインストールはしない。

### 目的

構築済み Host が Runtime を起動できるかを確認し、CHIRIMEN Runtime を立ち上げる。

### 実行コマンド

clone したディレクトリで、先に `doctor.sh` で Host を確認し、`[error]` が無いときだけ `start.sh` へ進む。

#### doctor.sh（Host 確認）

```sh
chmod +x scripts/doctor.sh scripts/start.sh
./scripts/doctor.sh
```

`doctor.sh` は読み取り専用である。sudo 不要。Host 設定（I2C / swap / Docker）は変えない。結果は `[ok]` / `[error]` / `[warn]`。`[error]` がある場合は exit 1。能力判定の読み方は [Runtime Diagnostics](./runtime-diagnostics.md)。

確認対象:

| 項目 | 見るもの |
| --- | --- |
| Raspberry Pi / OS / architecture | 機種、`PRETTY_NAME`、`uname -m` |
| Memory / Swap | `MemTotal` / `SwapTotal`。Pi 3 B+ 相当の低メモリで Swap が 0 なら `[error]` |
| I2C / `/dev/i2c-*` | `/dev/i2c-1` が必須。他の `i2c-*` は参考表示 |
| Docker Engine | `docker` コマンドと daemon |
| Docker Compose | `docker compose`（無ければ legacy `docker-compose`） |
| Host capability | `/sys/class/gpio`、`/dev/gpiomem*`、`/dev/gpiochip*`、`/dev/i2c-1` |

問題があるときは対応する Raspberry Pi Setup へ戻る。doctor 自身は修復しない。

| 問題 | 戻先 |
| --- | --- |
| Swap problem | `sudo ./setups/swap.sh` → `sudo ./setups/swap.sh --check` |
| I2C unavailable | `sudo ./setups/enable-i2c.sh` → `sudo reboot` → `./setups/enable-i2c.sh --check` |
| Docker unavailable | `./setups/docker.sh` |
| Compose unavailable | `./setups/docker-compose.sh` |

`[error]` が無ければ次の `start.sh` へ進む。`[warn]` だけなら起動はできるが、メッセージを読んでから進む。

#### start.sh（Runtime 起動）

機種により Docker build の扱いが異なる。正本は [Compatibility の Runtime Support / Development / Docker Build Support](../architecture/compatibility.md#runtime-support)。

##### Raspberry Pi 3 B+（Runtime-only）

Pi 3 B+ では on-device の Docker build は Unsupported である。`./scripts/start.sh` は引数なしだと `docker compose up --build` 相当になるため、**`--no-build` を付けて**起動する。`docker build` / `compose build` / `up --build` は案内しない。GHCR / Prebuilt image の手順もここでは書かない。

```sh
./scripts/start.sh --no-build            # Runtime + Browser Editor + Examples + Catalog（build なし）
./scripts/start.sh --lan --no-build      # 同上。Editor / Example / Catalog を LAN 公開
```

Compose を直接使う場合:

```sh
docker compose up
docker compose down
```

`--build` は付けない。停止は `docker compose down`。

##### Raspberry Pi 4 / Pi 5（Runtime / Development）

Pi 4 / Pi 5 では Docker build が Supported である。引数なしの `./scripts/start.sh` は既定で `--build` を付けて起動する。

```sh
./scripts/start.sh            # Runtime + Browser Editor + Examples + Catalog（既定で --build）
./scripts/start.sh --lan      # 同上。Editor / Example / Catalog を LAN 公開
```

Compose を直接使う場合の例: `docker compose up`（必要なら `--build`）。開発・build の詳細は [Development](./development.md)。

---

`start.sh` は host の hardware path を探査し、存在する device だけを Compose に渡す（Pi 3 / 4 / 5 で device マッピング手順は同一）。I2C 設定は変更しない。server は default で `33330` 番 port を使用する。既定は 64-bit の全サーバー起動である。

64-bit の初回対話起動では Browser Editor の password を決める。覚えておける文字列を 2 回入力する。gitignored の `.env` に `CHIRIMEN_EDITOR_PASSWORD` として書かれ、ログには平文を出さない。CI や TTY が無いとき、または既に password があるときは prompt しない。`.env` は Git に含めない。`auth: none` は使わない。LAN（`--lan`）でも password は必須である。Pi 3 B+ でメモリが厳しいときは起動後に `docker compose stop chirimen-editor`。Step 3 に Editor は必須ではない。

### 実行する理由

`doctor.sh` は Host Setup 完了後の読み取り専用診断である。不足があれば Step 1 へ戻る。`start.sh` は存在する GPIO / I2C device だけを Compose に渡し、CHIRIMEN Runtime を起動する。

### 完了確認

別ターミナルで:

```sh
curl http://127.0.0.1:33330/health
```

アクセス元は Raspberry Pi 上の shell、または SSH port forward 先である。

server の期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```

`status` が `ok` なら Step 2 は完了である。container 内で sysfs / device が見えることの確認例:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* /dev/i2c-1 2>/dev/null || true
```

I2C → Docker → Runtime のあと、`chirimen-server` から `/dev/i2c-1` が見えることは Raspberry Pi 5 で [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219) が確認済み。詳細は [Compatibility](../architecture/compatibility.md) の「I2C Host Setup → Docker Runtime 実機検証」。

任意の疎通:

```sh
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

| Port | Service | Role |
| --- | --- | --- |
| 33330 | chirimen-server | Hardware Runtime / WebSocket |
| 8080 | chirimen-editor | Browser Editor / code-server |
| 4173 | chirimen-examples | Example Server / Runtime Examples |
| 4200 | chirimen-example-catalog | Example Catalog |

Editor（`:8080`）を使うときは、初回 `./scripts/start.sh` で決めた password を入れる。`docker compose exec` で `config.yaml` を読む必要はない。忘れたときの退避は [Troubleshooting](./troubleshooting.md#editor-にログインできない--password-を忘れた)。`Learn → Edit → Save → Run → Verify` の正本は [Browser Development Environment](./browser-development.md)。実機 E2E は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）。

確認先は Example Server `:4173` である。Catalog（`:4200`）は題材の発見入口である。ported の「実行」は `:4173`、「編集」は Editor `:8080` から host `workspace/` を開く。Compose を uid なしで直接使うと保存時に Permission denied になることがある。

### 次の Step

→ [Step 3: Run Your First Example](#step-3-run-your-first-example)

### 失敗時

- `doctor.sh` で `[error]` → Host 側の不足。上の戻先表と [Step 1](#step-1-raspberry-pi-setup)、[Raspberry Pi Setup](./raspberry-pi-setup.md) へ戻る。能力判定の読み方は [Runtime Diagnostics](./runtime-diagnostics.md)
- 起動しない / health が返らない → [Troubleshooting](./troubleshooting.md) と [Runtime Diagnostics](./runtime-diagnostics.md)

## Step 3: Run Your First Example

Catalog から GPIO LED Blink を実行し、環境構築が成功したことを確認する。

### 目的

health だけでは GPIO 操作は確認できない。Example Catalog で題材を見つけ、GPIO LED Blink で LED を点滅させるところまでを Getting Started に含める。

### 実行コマンド

配線・部品の正本は [GPIO LED Blink](./gpio-led-blink.md)。Browser で Example Catalog から始める。

1. Example Catalog: `http://127.0.0.1:4200/`
2. 実行: ported の「実行」、または直接 `http://127.0.0.1:4173/led-blink/`
3. 編集（任意）: ported の「編集」→ Editor `:8080` → host `workspace/` に Save → Example タブを reload

Catalog（`:4200`）は題材の発見入口である。実行結果の確認先は Example Server `:4173`。編集の保存先は host `workspace/`。GPIO / I2C は Browser Polyfill が Runtime `:33330` へ接続して操作する。手順の詳細は [Catalog で題材を探す](./browser-development.md#catalog-で題材を探す)。出典・責務は [catalog.md](../examples/catalog.md)。

Editor（`:8080`）での編集はこの Step の完了条件ではない。Pi 3 B+ では Catalog と Example Server だけでよい。編集する場合は [Browser Development Environment](./browser-development.md)。

### 実行する理由

Step 2 の health は server の起動確認である。GPIO LED Blink まで進むと、Browser Polyfill → Runtime `:33330` → 実 GPIO の経路が通ったことが分かる。

### 完了確認

- Catalog（`http://127.0.0.1:4200/`）が開く
- GPIO LED Blink（`http://127.0.0.1:4173/led-blink/`）を開くと、GPIO26 の LED が **1 秒間隔**で点灯 / 消灯する

配線がまだなら [GPIO LED Blink](./gpio-led-blink.md) の必要部品と配線を先に完了する。

### 次の Step

Getting Started はここまでである。続けて試すなら:

- [I2C Scan](./i2c-scan.md)（HTML サンプル `http://127.0.0.1:4173/i2c-scan/`）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / 回路を学ぶ）
- [Browser Development Environment](./browser-development.md)（Editor で書く。任意）

### 失敗時

- LED が点かない / ページが開かない → [GPIO LED Blink の Troubleshooting](./gpio-led-blink.md#troubleshooting)
- Catalog や Example Server が開かない → [Troubleshooting](./troubleshooting.md#browser-development-の切り分け)
- GPIO / I2C が unavailable → [Step 2](#step-2-chirimen-setup) の `doctor.sh` と [Raspberry Pi Setup](./raspberry-pi-setup.md)

## その先

| やりたいこと | 参照 |
| --- | --- |
| GPIO / I2C / JavaScript / 回路を学ぶ | [CHIRIMEN Tutorial](./chirimen-tutorial.md)。環境構築は Tutorial ではなくこのページの Step 1〜2 |
| タクトスイッチの入力を確認する | [GPIO Input](./gpio-input.md)。HTML サンプル（`http://127.0.0.1:4173/button/`）。配線は [回路仕様](../examples/gpio-input.md) |
| I2C bus の address を scan する | [I2C Scan](./i2c-scan.md)。HTML サンプル（`http://127.0.0.1:4173/i2c-scan/`）。検証用 slave は ADT7410（`0x48`）。配線は [検証仕様](../examples/i2c-scan.md) |
| Runtime の疎通を確認する | [Runtime Diagnostics](./runtime-diagnostics.md)。Host は `doctor.sh`、Server は `GET /health`、Browser は GPIO LED Blink / GPIO Input / I2C Scan |
| 旧 `polyfill.js` 相当の script 読み込み | [browser-polyfill.md](./browser-polyfill.md) |
| 起動失敗・Permission denied など | [Troubleshooting](./troubleshooting.md#browser-development-の切り分け) |
| Browser Editor から Example を編集・実行する | [Browser Development Environment](./browser-development.md)（`:8080` → host `workspace/` → Save → `:4173`） |
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

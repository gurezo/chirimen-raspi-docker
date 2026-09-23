# Getting Started

初めて使う人が次に何をすればよいか迷わないための3段階。Host を整え、Runtime を起動し、Example Catalog から最初の Example まで進む。Host に Node.js / npm / pnpm / Nx は不要である。Docker build コマンドも第一導線には出さない。

```text
Getting Started
├─ Step 1: Raspberry Pi Setup
│    └─ ./setups/setup.sh（必要なら reboot → 再実行）
├─ Step 2: Start Runtime
│    └─ docker compose up -d
└─ Step 3: Run Your First Example
     ├─ Example Catalog :4200 → GPIO LED Blink（環境確認）
     └─ 続けて: my-first-example（自作 / workspace/）
```

最短コマンド:

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
./setups/setup.sh
# 必要なら sudo reboot のあと、同じ ./setups/setup.sh を再実行
docker compose up -d
```

起動後の第一入口は `http://localhost:4200`（Example Catalog）である。覚えやすい別名は `http://localhost/catalog`（gateway が `:4200` へ 302）。

Step 3 は Catalog から `led-blink` を実行して **環境構築の成功を確認する**。そのあと [my-first-example を作成する](#my-first-example-を作成する)（First Example Guide）→ Desktop または Browser Editor `:8080` → Example Server `:4173` → Runtime `:33330` が自作 Example の推奨導線である。Step 2 のあとの利用フローは [Browser Development Environment](./browser-development.md) と同じである。編集先は host `workspace/`。Editor は Step 3 の完了条件ではない。

```text
./setups/setup.sh → docker compose up -d
  ↓
http://localhost:4200（第一入口。同等: http://localhost/catalog）
  ↓
Step 3: Example Catalog → :4173/led-blink/（環境確認）
  ↓
Create your first example（workspace/my-first-example）
  ↓
Desktop 任意エディタ または Browser Editor :8080
  ↓
Example Server :4173 → Save → Browser reload
  ↓
Browser Polyfill → chirimen-runtime :33330 → GPIO / I2C
```

## workspace/（HTML / JavaScript の保存場所）

host 側の `workspace/` は、既存の Runtime Example と、あなたが作る HTML + Vanilla JavaScript Example の作業領域である。container 内部の mount path よりも、「ここに保存すれば Example Server から実行できる」ことを優先する。

リポジトリ（clone 先）からの相対パスで置く:

```text
<chirimen-raspi-docker の clone 先>/
└── workspace/
    └── my-first-example/
        ├── index.html
        ├── main.js
        └── polyfill.js
```

ホームディレクトリへ clone した場合の例は `~/chirimen-raspi-docker/workspace/` である。絶対パスは clone 先によって変わるため、固定パスとしては扱わない。

`workspace/<subdir>/` に置いた内容は Example Server から `http://127.0.0.1:4173/<subdir>/` で配信される。同ディレクトリには `led-blink/` などの既存 Example もある。配置の正本は [workspace/README.md](../../workspace/README.md)。編集の2経路は次節を、Browser Editor の操作詳細は [Browser Development Environment](./browser-development.md) を参照する。

### Example の編集方法（2経路）

Example の編集は次のどちらでもよい。どちらも同じ host `workspace/` を編集する。Browser Editor は必須ではない。

```text
A. Raspberry Pi OS Desktop
   ↓
任意のエディタ
   ↓
workspace/

B. Browser
   ↓
http://127.0.0.1:8080/
   ↓
Browser Editor
   ↓
workspace/

        ↓
Example Server :4173
```

- **A. Raspberry Pi OS Desktop**: clone 先の `workspace/` を、Desktop 上の任意のエディタ（テキストエディタなど）で直接編集できる。
- **B. Browser Editor**: Browser で `http://127.0.0.1:8080/`（または `http://localhost:8080/`）を開き、同じ `workspace/` を編集できる。操作の詳細は [Browser Development Environment](./browser-development.md)。

どちらから保存しても同じ Example が更新される。確認先は Example Server `:4173` である（保存後は Browser を reload する）。

### my-first-example を作成する

最初の自作 Example は HTML + Vanilla JavaScript だけである。Node.js / npm / pnpm / Nx や Docker build は不要である。

1. clone 先の `workspace/` へ移動し、ディレクトリを作る。

```bash
cd <chirimen-raspi-docker の clone 先>/workspace
mkdir my-first-example
cd my-first-example
```

2. `index.html` を作成する（コピーして使える）。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My First Example</title>
    <style>
      p {
        color: blue;
        text-align: center;
        font-size: 24px;
      }
    </style>
    <script src="./polyfill.js"></script>
    <script src="./main.js" defer></script>
  </head>
  <body>
    <p>LED→GPIO-26</p>
  </body>
</html>
```

3. `main.js` を作成する（コピーして使える）。GPIO 26 に LED を接続したときの最短 Blink である。

```js
async function main() {
  const gpioAccess = await navigator.requestGPIOAccess();
  const port = gpioAccess.ports.get(26);
  await port.export("out");

  while (true) {
    await port.write(1);
    await sleep(1000);
    await port.write(0);
    await sleep(1000);
  }
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

main();
```

4. CHIRIMEN 用の `polyfill.js` を同じディレクトリへ置く。既存の `led-blink` からコピーすれば足りる（Node.js は不要）。

```bash
cp ../led-blink/polyfill.js .
```

リポジトリには同じ内容の正本として [workspace/my-first-example/](../../workspace/my-first-example/) もある。

5. Runtime 起動後（Step 2）、Browser で `http://127.0.0.1:4173/my-first-example/` を開く。ファイルを保存したあとは Browser を reload して確認する。詳細は次節。

### Example Server :4173 で実行・更新する

Example Server `:4173`（Compose サービス `chirimen-examples`）は、host の `workspace/` を静的ファイルとして配信する。確認先はここである。Catalog（`:4200`）は題材の発見入口であり、編集結果の確認先ではない。GPIO / I2C は Browser の Polyfill が Runtime `:33330` へ接続して操作する。Raspberry Pi 上で Runtime が起動済みなら、Docker build や Node.js / npm / pnpm / Nx は不要である。

directory と URL の対応:

```text
workspace/my-first-example/
  ↓
http://127.0.0.1:4173/my-first-example/
```

一般形は `workspace/<subdir>/` → `http://127.0.0.1:4173/<subdir>/` である。

基本フロー:

```text
1. docker compose up -d（Step 2）済み
2. workspace に Example を作成（前節）
3. Browser で http://127.0.0.1:4173/<example>/ を開く
4. HTML / JavaScript を編集（Desktop 任意エディタまたは Browser Editor）
5. 保存
6. Browser を reload（hot reload は無い）
7. 動作確認
```

最低限のトラブル確認:

- `docker compose ps` で `chirimen-examples` と `chirimen-runtime` が running か見る
- 開いている URL が編集中の `workspace/<subdir>/` と一致しているか確認する（Catalog `:4200` を見ていないか）
- Browser の Developer Tools → Console に JavaScript error が出ていないか見る
- Runtime: `curl http://127.0.0.1:33330/health`（詳細は [Runtime Diagnostics](./runtime-diagnostics.md)）

詳細な切り分けは [Troubleshooting](./troubleshooting.md) の次を参照する。

- [Example の静的サーバ（4173）が開かない](./troubleshooting.md#example-の静的サーバ4173が開かない)
- [Example を保存しても Browser に反映されない](./troubleshooting.md#example-を保存しても-browser-に反映されない)
- [Example は開くが GPIO / I2C が動かない](./troubleshooting.md#example-は開くが-gpio--i2c-が動かない)

`setups/` は Host 構築（入口は `setup.sh`）、`scripts/` は診断と上級者向け起動補助。役割の入口は [setups/README.md](../../setups/README.md) と [scripts/README.md](../../scripts/README.md)。Host 構築の詳細正本は [Raspberry Pi Setup](./raspberry-pi-setup.md)。

関連:

- 親 Issue: [#326 初心者向け setup.sh を追加し CHIRIMEN 初期セットアップと Documentation の導線を一本化する](https://github.com/gurezo/chirimen-raspi-docker/issues/326)
- 子 Issue: [#332 Getting Started を setup.sh → docker compose up → Example Catalog の初心者向け導線へ変更する](https://github.com/gurezo/chirimen-raspi-docker/issues/332)
- 親 Issue: [#315 初心者が workspace に HTML / JavaScript を作成して CHIRIMEN を実行できる Getting Started を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/315)
- 子 Issue: [#316 Getting Started に workspace の役割とユーザー作成 Example の保存場所を追加する](https://github.com/gurezo/chirimen-raspi-docker/issues/316)
- 子 Issue: [#317 my-first-example を作成する初心者向け CHIRIMEN チュートリアルを追加する](https://github.com/gurezo/chirimen-raspi-docker/issues/317)
- 子 Issue: [#318 Raspberry Pi OS Desktop と Browser Editor の2種類の Example 編集方法を説明する](https://github.com/gurezo/chirimen-raspi-docker/issues/318)
- 子 Issue: [#319 Example Server :4173 を使った自作 Example の実行・更新手順を追加する](https://github.com/gurezo/chirimen-raspi-docker/issues/319)
- 子 Issue: [#320 初心者向け Documentation の workspace / Editor / Example Server 導線を統一する](https://github.com/gurezo/chirimen-raspi-docker/issues/320)
- 親 Issue: [#304 Raspberry Pi 3 B+ を Runtime-only とし Docker build を Pi 4 / Pi 5 に限定する](https://github.com/gurezo/chirimen-raspi-docker/issues/304)
- 子 Issue: [#306 Getting Started から Raspberry Pi 3 B+ の Docker build 導線を除外する](https://github.com/gurezo/chirimen-raspi-docker/issues/306)
- 子 Issue: [#309 Documentation 全体の Raspberry Pi 3 B+ Docker build 記述を棚卸しする](https://github.com/gurezo/chirimen-raspi-docker/issues/309)
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
- 標準環境: Raspberry Pi OS 64-bit Desktop（Lite も可）
- モデル別ロール（正本は [Compatibility](../architecture/compatibility.md)）:
  - **Raspberry Pi 3 B+**: **Runtime-only**（`docker compose up -d` / `down`）。`docker build` / `compose build` / `up --build` および `./scripts/start.sh` 既定の自動 `--build` は Unsupported
  - **Raspberry Pi 4 / Pi 5**: Runtime / Development（Docker build Supported。Development 導線は [Development](./development.md)）
- Getting Started の第一導線は `./setups/setup.sh` → `docker compose up -d` → `http://localhost:4200` である。Pi 3 B+ では on-device の Docker build を案内しない
- Pi 3 B+ の基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan。code-server（Browser Editor `:8080`）は必須ではない。メモリが厳しいときは起動後に `docker compose stop chirimen-editor`。低メモリ時の任意 Swap / Pi 4・Pi 5 の build 用 Swap は [Raspberry Pi Setup の swap.sh](./raspberry-pi-setup.md#development-only-swapsh)（**Development-only**。beginner Step 1 では必須ではない）

> 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)

clone や I2C / Docker / GPIO の準備は [Step 1](#step-1-raspberry-pi-setup) で行う。`swap.sh` と Docker build は beginner Step 1 に含めない（Pi 4 / Pi 5 の Development は [Development](./development.md)）。開発マシン単体（macOS など）では GPIO / I2C device が無いことがある。実機機能の検証は Raspberry Pi 上で行う。詳細は [Troubleshooting](./troubleshooting.md) の「非 Pi 環境」を参照。

## Step 1: Raspberry Pi Setup

Raspberry Pi OS を CHIRIMEN Runtime が動く Host にする。

### 目的

`./setups/setup.sh`（または必要な `setups/*.sh`）で Host を整える。`setup.sh` は内部で Runtime readiness（`doctor.sh`）も確認する。起動（`docker compose up -d`）はこの Step では行わない。`swap.sh` と Docker build は含めない。

### 実行コマンド

詳細・reboot の要否・再実行時の安全性は [Raspberry Pi Setup](./raspberry-pi-setup.md) が正本である。**beginner 向け**:

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
./setups/setup.sh
```

`setup.sh` は状態を確認し、必要な Host script（I2C / Squeekboard / Docker / Compose）だけを呼ぶ。`swap.sh`・Docker build・`start.sh` は実行しない。reboot が必要なら案内に従い、reboot 後に同じ `./setups/setup.sh` を再実行する。

#### Advanced / Manual Setup

初心者は上記の `./setups/setup.sh` だけを使う。個別 script の判断は不要である。確認や上級者向けに手で実行する場合の Runtime Host 標準順（`swap.sh` なし）:

```sh
sudo ./setups/enable-i2c.sh
sudo ./setups/disable-squeekboard.sh
./setups/docker.sh
./setups/docker-compose.sh
```

| 順 | Script | 役割 |
| --- | --- | --- |
| — | `setup.sh` | beginner 入口。必要な上記 script だけを呼ぶ |
| 1 | `enable-i2c.sh` | `/dev/i2c-1` を使えるようにする。無いときは reboot 後に `--check`（または `setup.sh` 再実行） |
| 2 | `disable-squeekboard.sh` | Desktop のスクリーンキーボードを Off。Lite では変更せず終わる |
| 3 | `docker.sh` | Docker Engine。スクリプト末尾が reboot する |
| 4 | `docker-compose.sh` | Compose。`docker.sh` の reboot 後に実行する |

`swap.sh` は **Development-only**（Pi 4 / Pi 5 の Source Development / Docker build の OOM 緩和）。手順は [Raspberry Pi Setup の swap.sh](./raspberry-pi-setup.md#development-only-swapsh) と [Development](./development.md)。

GPIO の host 確認も Step 1 の完了に含む。手順は [Raspberry Pi Setup の GPIO](./raspberry-pi-setup.md#gpio)。

### 実行する理由

CHIRIMEN Runtime は Docker Compose で動き、GPIO / I2C は Host の device を使う。Host が揃っていないと `setup.sh` 内の readiness（`doctor.sh`）が `[error]` になる。

### 完了確認

次を満たせば Step 1 は完了である。チェック項目の正本は [Raspberry Pi Setup の完了状態](./raspberry-pi-setup.md#raspberry-pi-setup-の完了状態)。

- リポジトリを clone 済み
- `./setups/setup.sh` が完了している、または手動で次を満たす
- `./setups/enable-i2c.sh --check` で `/dev/i2c-1` がある
- `./setups/disable-squeekboard.sh --check` を実行済み（Lite は変更なしでも完了）
- `docker --version` / `docker compose version` が通る（無ければ `docker-compose --version`）
- GPIO の host 確認（`/sys/class/gpio`）
- `sudo ./setups/swap.sh --check` は **Runtime / beginner の完了条件ではない**

### 次の Step

→ [Step 2: Start Runtime](#step-2-start-runtime)

### 失敗時

Host 側の不足である。[Raspberry Pi Setup](./raspberry-pi-setup.md) の該当スクリプト節と、[Troubleshooting](./troubleshooting.md) の Host 切り分けを見る。`doctor.sh` は Host 設定を変えない（手動再実行は任意。通常は `setup.sh` 経由）。

<a id="step-2-chirimen-setup"></a>

## Step 2: Start Runtime

Host 上で CHIRIMEN Runtime を起動する。I2C / swap / Docker のインストールはしない。

### 目的

Step 1 で整えた Host 上で Compose サービスを起動し、Example Catalog（`:4200`）を開ける状態にする。

### 実行コマンド

clone したディレクトリで:

```sh
docker compose up -d
```

停止は `docker compose down`。第一入口は Browser で次を開く:

```text
http://localhost:4200
```

（同等: `http://127.0.0.1:4200/`）

初心者向け第一導線では `docker build` / `compose build` / `up --build` / `./scripts/start.sh` の機種別 `--build` 分岐は使わない。Pi 3 B+ / 4 / 5 とも同じ `docker compose up -d` である。

#### 任意: doctor.sh（手動の readiness 再確認）

`./setups/setup.sh` は完了時に `scripts/doctor.sh` を readiness として実行済みである。手動で再確認したいときだけ:

```sh
./scripts/doctor.sh
```

読み取り専用。sudo 不要。Host 設定は変えない。結果の読み方は [Runtime Diagnostics](./runtime-diagnostics.md)。問題があるときは [Step 1](#step-1-raspberry-pi-setup) / [Raspberry Pi Setup](./raspberry-pi-setup.md) へ戻る。

#### Development / 上級者向け: start.sh

device マッピングや LAN 公開、Pi 4 / Pi 5 での on-device Docker build が必要なときは `./scripts/start.sh` を使う（既定は `--build` 相当）。**beginner の第一導線ではない。** 詳細は [scripts/README.md](../../scripts/README.md)、[Development](./development.md)、[Compatibility](../architecture/compatibility.md#runtime-support)。

Pi 3 B+ で `start.sh` を使う場合は必ず `--no-build`（on-device build は Unsupported）。

### 実行する理由

`setup.sh` で Host と readiness を済ませたあと、Compose で Runtime / Catalog / Example Server / Editor を起動する。第一入口を Catalog `:4200` に固定し、coding 開始までの手順を短くする。

### 完了確認

別ターミナルで:

```sh
curl -fsS http://127.0.0.1:4200/
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

`http://localhost:4200` が開き、`status` が `ok` なら Step 2 は完了である（同等: `http://localhost/catalog`）。任意の疎通:

```sh
curl -fsS http://127.0.0.1:4173/led-blink/
curl -sI http://127.0.0.1/catalog
```

| Port | Service | Role | name |
| --- | --- | --- | --- |
| 33330 | chirimen-runtime | Hardware Runtime / WebSocket | runtime |
| 8080 | chirimen-editor | Browser Editor / code-server | editor |
| 4173 | chirimen-examples | Example Server / Runtime Examples | example |
| 4200 | chirimen-example-catalog | Example Catalog | catalog |

`name` パス（`:80` → 302）: `/runtime` `/editor` `/example` `/catalog`。正本 URL は各 Port。

Editor（`:8080`）を使うときは password が必要な場合がある。忘れたときの退避は [Troubleshooting](./troubleshooting.md#editor-にログインできない--password-を忘れた)。`Learn → Edit → Save → Run → Verify` の正本は [Browser Development Environment](./browser-development.md)。実機 E2E は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）。

確認先は Example Server `:4173` である。Catalog（`:4200`）は題材の発見入口である。ported の「実行」は `:4173`、「編集」は Editor `:8080` から host `workspace/` を開く。Pi 3 B+ でメモリが厳しいときは `docker compose stop chirimen-editor`。Step 3 に Editor は必須ではない。

### 次の Step

→ [Step 3: Run Your First Example](#step-3-run-your-first-example)

### 失敗時

- Catalog / health が開かない → [Troubleshooting](./troubleshooting.md) と [Runtime Diagnostics](./runtime-diagnostics.md)
- Host 側の不足が疑わしい → `./scripts/doctor.sh`（任意）と [Step 1](#step-1-raspberry-pi-setup)、[Raspberry Pi Setup](./raspberry-pi-setup.md)

## Step 3: Run Your First Example

Catalog から GPIO LED Blink を実行し、環境構築が成功したことを確認する。

### 目的

health だけでは GPIO 操作は確認できない。Example Catalog で題材を見つけ、GPIO LED Blink で LED を点滅させるところまでを Getting Started に含める。

### 実行コマンド

配線・部品の正本は [GPIO LED Blink](./gpio-led-blink.md)。Browser で Example Catalog（第一入口）から始める。

1. Example Catalog: `http://localhost:4200/`（同等: `http://localhost/catalog`、`http://127.0.0.1:4200/`）
2. 実行: ported の「実行」、または直接 `http://127.0.0.1:4173/led-blink/`
3. 編集（任意）: ported の「編集」→ Editor `:8080` → host `workspace/` に Save → Example タブを reload

Catalog（`:4200`）は題材の発見入口である。実行結果の確認先は Example Server `:4173`。編集の保存先は host `workspace/`。GPIO / I2C は Browser Polyfill が Runtime `:33330` へ接続して操作する。手順の詳細は [Catalog で題材を探す](./browser-development.md#catalog-で題材を探す)。出典・責務は [catalog.md](../examples/catalog.md)。

Editor（`:8080`）での編集はこの Step の完了条件ではない。Pi 3 B+ では Catalog と Example Server だけでよい。編集する場合は [Browser Development Environment](./browser-development.md)。

### 実行する理由

Step 2 で Catalog が開くことは起動確認である。GPIO LED Blink まで進むと、Browser Polyfill → Runtime `:33330` → 実 GPIO の経路が通ったことが分かる。

### 完了確認

- Catalog（`http://localhost:4200/`）が開く
- GPIO LED Blink（`http://127.0.0.1:4173/led-blink/`）を開くと、GPIO26 の LED が **1 秒間隔**で点灯 / 消灯する

配線がまだなら [GPIO LED Blink](./gpio-led-blink.md) の必要部品と配線を先に完了する。

### 次の Step

Getting Started の環境確認（Step 3）はここまでである。続けて自作 Example（First Example Guide）へ進むなら:

- [my-first-example を作成する](#my-first-example-を作成する)
- [Example の編集方法（2経路）](#example-の編集方法2経路)（Desktop または Browser Editor `:8080`）
- [Example Server :4173 で実行・更新する](#example-server-4173-で実行更新する)（保存 → reload）
- [workspace/README.md](../../workspace/README.md)

さらに試すなら:

- [I2C Scan](./i2c-scan.md)（HTML サンプル `http://127.0.0.1:4173/i2c-scan/`）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / 回路を学ぶ）
- [Browser Development Environment](./browser-development.md)（Editor で書く。任意）

### 失敗時

- LED が点かない / ページが開かない → [GPIO LED Blink の Troubleshooting](./gpio-led-blink.md#troubleshooting)
- Catalog や Example Server が開かない → [Troubleshooting](./troubleshooting.md#browser-development-の切り分け)
- GPIO / I2C が unavailable → [Step 2](#step-2-start-runtime) の任意 `doctor.sh` と [Raspberry Pi Setup](./raspberry-pi-setup.md)

## その先

| やりたいこと | 参照 |
| --- | --- |
| 自作 Example を :4173 で実行・更新する | [Example Server :4173 で実行・更新する](#example-server-4173-で実行更新する)（保存 → reload） |
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
| Browser Editor を LAN から開く | Development / 上級者向けの `./scripts/start.sh --lan`。[browser-development.md](./browser-development.md#editor-を開く)。Internet 公開はしない |
| Browser Editor の Extension | [browser-development.md](./browser-development.md#editor-を開く)。プリインストール・推奨しない |
| 設計・依存境界を読む | [Architecture overview](../architecture/overview.md) |
| Protocol / wire format | [protocol.md](../architecture/protocol.md) |
| 公開 API リファレンス | [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/) |
| リポジトリをホスト上で開発する（Node / pnpm / Nx） | [Development Guide](./development.md)（**beginner 第一導線外**） |

Runtime 利用が終わったあとにリポジトリ開発へ進む場合だけ [Development Guide](./development.md) を参照する。Host に Node.js / npm / pnpm / Nx は Runtime には不要である。

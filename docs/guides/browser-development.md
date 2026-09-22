# Browser Development Environment

初めて利用する人が Browser Editor を起動し、Example を編集・実行する手順。

Raspberry Pi OS Desktop 上の任意のエディタでも、同じ host `workspace/` を直接編集できる。Browser Editor は必須ではない。2経路の概要は [Getting Started の Example の編集方法（2経路）](./getting-started.md#example-の編集方法2経路)。このページは Browser Editor 経路の詳細である。

関連:

- 親 Issue: [#237 Browser Development Flow を Tutorial → Editor → Workspace → Example Server に再設計する](https://github.com/gurezo/chirimen-raspi-docker/issues/237)
- 子 Issue: [#242 Browser Development Documentation と navigation を新しい開発フローに合わせて更新する](https://github.com/gurezo/chirimen-raspi-docker/issues/242)
- 子 Issue: [#243 Browser Development Flow を Raspberry Pi 実機で E2E 検証する](https://github.com/gurezo/chirimen-raspi-docker/issues/243)
- 親 Issue: [#172 Phase 8: Browser Development Environment](https://github.com/gurezo/chirimen-raspi-docker/issues/172)
- 子 Issue: [#183 Browser Development Environment の利用ガイドを作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/183)
- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#255 Example Catalog から Workspace Example を開く導線を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/255)
- 実機検証結果: [Compatibility の Browser Development Flow 実機検証（#243）](../architecture/compatibility.md#browser-development-flow-実機検証243)
- 選定・永続化・認証の正本: [browser-editor.md](../architecture/browser-editor.md)
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築。このページの前）
- [Getting Started](./getting-started.md)（Runtime 起動は Step 2: `docker compose up -d`）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / I2C / JavaScript / 回路を学ぶ）
- [workspace/README.md](../../workspace/README.md)
- [Troubleshooting](./troubleshooting.md)

このガイドの手順だけで、`Learn → Edit → Save → Run → Verify` を再現できる。題材探しの入口は Example Catalog である。

```text
CHIRIMEN Tutorial
GPIO / I2C / JavaScript / 回路を学ぶ
        ↓
Example Catalog :4200
        ↓
ported「実行」 → Example Server :4173
ported「編集」 → Browser Editor :8080（workspace ルート）
        ↓
Edit / Save
        ↓
Example タブを Browser reload
        ↓
chirimen-server :33330
        ↓
Raspberry Pi GPIO / I2C
```

Catalog（`:4200`）は題材の発見入口である。編集結果の確認先は Example Server `:4173`。Runtime / Browser Polyfill / GPIO / I2C の疎通は [Runtime Diagnostics](./runtime-diagnostics.md) で確認する。

legacy Example は回路図があれば Catalog から回路図を案内するだけである。実行 / 編集リンクは出さない。旧 GC デモページは開かない。Editor は `/home/coder/project`（host `./workspace`）を開く。子ディレクトリを新しい workspace にはしない。

## 概要

ユーザー向けの役割:

```text
Tutorial = 学ぶ
Editor   = 書く
Examples = 書いたものを動かす
Catalog  = Example を探す
```

| Port | Service | Role |
| --- | --- | --- |
| 33330 | chirimen-server | Hardware Runtime / WebSocket |
| 8080 | chirimen-editor | Browser Editor / code-server |
| 4173 | chirimen-examples | Example Server / Runtime Examples |
| 4200 | chirimen-example-catalog | Example Catalog |

Editor と CHIRIMEN Runtime は別 container である。Editor は Hardware Runtime ではない。GPIO / I2C は Browser Polyfill → WebSocket → `chirimen-server` → Node Runtime を経由する。Editor container へ `/dev/gpio*` / `/dev/i2c-1` は渡さない。

編集は Editor、実行は別 Browser タブの HTML Example（`:4173`）である。

```text
docker compose up -d
  （Development / 上級者: ./scripts/start.sh。Pi 4 / Pi 5 は既定 --build。Pi 3 B+ は --no-build）
↓
Browser で Catalog を開く（http://127.0.0.1:4200/）
↓
ported「実行」で Example Server を開く（http://127.0.0.1:4173/...）
ported「編集」で Editor を開く（http://127.0.0.1:8080/?folder=/home/coder/project）
↓
Workspace で Example を編集して保存（workspace）
↓
保存後に Example タブを reload する
↓
chirimen-server（ws://localhost:33330/）経由で GPIO / I2C を操作する
```

方針の詳細は [browser-editor.md](../architecture/browser-editor.md)。

前提:

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility](../architecture/compatibility.md)）。**Pi 3 B+ は Runtime-only**
- サポート対象は Raspberry Pi OS 64-bit
- 標準環境: Raspberry Pi OS 64-bit Desktop（Lite も可）
- Docker と Docker Compose
- リポジトリを clone 済みであること。Host 構築は [Raspberry Pi Setup](./raspberry-pi-setup.md)

> 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)

Docker build / `compose build` / `up --build` の対象は **Raspberry Pi 4 / Pi 5** のみである（[Compatibility](../architecture/compatibility.md) / [Development](./development.md)）。**Pi 3 B+ は Runtime-only** であり、on-device Docker build は Unsupported。`swap.sh` を Pi 3 B+ build の有効化手段としては案内しない。

Pi 4 / Pi 5 で Docker build 時にメモリ不足や OOM が出る場合は `sudo ./setups/swap.sh`（既定 8G）を実行する。CPU ファンは高負荷ビルド時の熱対策として任意だが推奨する。手順は [Raspberry Pi Setup](./raspberry-pi-setup.md) と [setups/README.md](../../setups/README.md)。

Pi 3 B+ の基本体験に **code-server（Browser Editor `:8080`）は含めない。** Catalog `:4200` と Example Server `:4173` で GPIO LED Blink / I2C Scan は成立する。このページの Editor 手順は任意の高負荷機能である。メモリが厳しいときは起動後に `docker compose stop chirimen-editor`。

## CHIRIMEN Tutorial で学ぶ

GPIO / I2C / JavaScript / 回路の概念は [CHIRIMEN Tutorial](./chirimen-tutorial.md) で学び、このガイドでは Editor で書く。Tutorial の SD イメージや CodeSandbox は本リポジトリの Editor ではない。

Tutorial の環境構築手順は本リポジトリの手順ではない。clone / Docker / Runtime は [Getting Started](./getting-started.md) を正本とする（Step 1 の詳細は [Raspberry Pi Setup](./raspberry-pi-setup.md)）。

## Runtime / Editor / Examples を起動する

beginner の第一導線は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime) の `docker compose up -d` である。このページでは Browser Editor 利用向けに、uid / device mapping を渡す `./scripts/start.sh` を案内する（Development / 上級者向け。既定は `--build` 相当のため **Pi 4 / Pi 5**。Pi 3 B+ は `--no-build`）。

```sh
docker compose up -d          # beginner（Getting Started Step 2）

# 以下は Development / 上級者向け
chmod +x scripts/doctor.sh scripts/start.sh
./scripts/doctor.sh
./scripts/start.sh            # Pi 4 / Pi 5。Runtime + Browser Editor + Examples + Catalog（既定で --build）
./scripts/start.sh --lan      # 同上。Editor / Example / Catalog を LAN 公開
./scripts/start.sh --no-build # Pi 3 B+ Runtime-only（build なし）
```

`start.sh` を使わず Compose だけだと Editor の uid が `1000` / `coder` になり、[Example が保存できない](./troubleshooting.md#editor-で-example-が保存できないpermission-denied) ことがある。Desktop 上の任意エディタで `workspace/` を編集する場合は beginner の `docker compose up -d` で足りる。

32-bit OS は Unsupported。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md) を参照する（現行の Getting Started / セットアップ手順ではない）。

health:

```sh
curl http://127.0.0.1:33330/health
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

HTTP の確認 URL は Raspberry Pi 上、または SSH port forward 先の `127.0.0.1` である。`ws://localhost:33330/` の localhost は Browser が動いているマシンを指す。

`/healthz` は JSON の `expired` でも HTTP 200 なら Editor プロセスは生存している。Runtime の応答例は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime)。

## Catalog で題材を探す

Browser で `http://127.0.0.1:4200/` を開く。ported Example だけ「実行」と「編集」がある。

- **実行**: Example Server（`:4173`）。URL は `legacy-inventory.json` の `runtimeExamplePath` から解決する
- **編集**: Editor（`:8080/?folder=/home/coder/project`）。既存 workspace ルートを開く

legacy は回路図の外部リンクのみである。実行 / 編集は出さない。旧 GC デモページは案内しない。Run Task **Open Example Catalog**（[`tasks.json`](../../workspace/.vscode/tasks.json)）は URL 案内のみ。サーバは起動しない。

## Editor を開く

Browser で `http://127.0.0.1:8080` を開く。既定の host bind は `127.0.0.1`（同一ホスト / SSH port forward）。

Editor は password 認証である。初回の対話 `./scripts/start.sh` で決めた password を入れる。値は gitignored の `.env`（[`.env.example`](../../.env.example)）に `CHIRIMEN_EDITOR_PASSWORD` として残る。ログには平文を出さない。`auth: none` は使わない。`--lan` でも password は必須である。

`docker compose exec` で `config.yaml` を読む手順は通常不要である。password を忘れたときや非対話起動で volume 生成した場合の退避は [Troubleshooting](./troubleshooting.md#editor-にログインできない--password-を忘れた)。

LAN の別マシンから開くときは `./scripts/start.sh --lan`。Internet へは出さない。方針は [Publish / bind](../architecture/browser-editor.md#publish--bind181)。

プロジェクトは code-server / VS Code Extension をプリインストール・配布・推奨・必須にしない（[#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201)）。CHIRIMEN Runtime と bundled examples は Editor Extension を必要としない。

確認は、workspace の HTML / JS を開いて編集できることである。code-server 内蔵の HTML / CSS / JavaScript Language Features は Editor 本体の一部であり、プリインストール Extension ではない。

利用者が任意に入れる Extension は named volume `chirimen-editor-local` に残る。Marketplace は Open VSX / Coder gallery である。Microsoft Marketplace（GitHub Copilot など）は使えない。方針は [Extensions](../architecture/browser-editor.md#extensions)。

## Workspace を開く

保存先:

```text
Editor: /home/coder/project
Host:   ./workspace
```

Editor と Example Server は同じ host directory を共有する。container 内だけには保存されない。`docker compose down` 後も host `./workspace` は残る。Desktop 上の任意エディタで編集する場合も、同じ host `./workspace` を指す。

```text
Host ./workspace
      │
      ├─────────────────────┐
      ↓                     ↓
chirimen-editor       chirimen-examples
/home/coder/project   /usr/share/nginx/html
      │                     │
      │ Edit / Save         │ Serve
      └──────────────────→ :4173
```

workspace は bind mount `./workspace` → `/home/coder/project` である。monorepo 全体は mount しない。`package.json` / `node_modules` は無い。`pnpm` / `nx` は Editor では使わない。

| ディレクトリ | Example |
| --- | --- |
| `my-first-example/` | 初心者向け最初の自作 Example（BCM 26 LED Blink） |
| `led-blink/` | GPIO LED Blink |
| `button/` | GPIO Input / onchange |
| `i2c-scan/` | I2C Scan |
| `pir-sensor/` | GPIO PIR Sensor |
| `adt7410/` | ADT7410 温度読み取り |
| `sht30/` | SHT30 温湿度 |
| `ads1115/` | ADS1115 4ch ADC |

配置の正本は [workspace/README.md](../../workspace/README.md)。初心者向けの自作導線（作成 → 編集 → `:4173`）は [Getting Started](./getting-started.md#my-first-example-を作成する)。回路・配線は [GPIO LED Blink](./gpio-led-blink.md) / [GPIO Input](./gpio-input.md) / [I2C Scan](./i2c-scan.md)。Phase 2 の回路仕様は [gpio-pir-sensor.md](../examples/gpio-pir-sensor.md) / [i2c-adt7410.md](../examples/i2c-adt7410.md) / [i2c-sht30.md](../examples/i2c-sht30.md) / [i2c-ads1115.md](../examples/i2c-ads1115.md)。

## Example を編集する

標準操作は `Edit → Save → Browser reload` である。静的ファイルのため hot reload は無い。初心者向けの一連手順（directory と URL の対応・保存 → reload・最低限のトラブル確認）は [Getting Started の Example Server :4173 で実行・更新する](./getting-started.md#example-server-4173-で実行更新する)。

Editor（`:8080`）で `my-first-example/` / `led-blink/` / `button/` / `i2c-scan/` / `pir-sensor/` / `adt7410/` / `sht30/` / `ads1115/` を開いて編集する。配線と期待結果は各 Example ガイドまたは回路仕様へ。

## 保存する

Editor で保存する。保存先は Editor `/home/coder/project` = host `./workspace` である。container 内だけには保存されない。

保存できないときは [Editor で Example が保存できない](./troubleshooting.md#editor-で-example-が保存できないpermission-denied) を確認する。

## Example Server を開く

別タブで Example Server（`:4173`）を開く（Compose `chirimen-examples` が起動済み）。確認先は Example Server `:4173` である。Catalog（`:4200`）は編集結果を表示しない。

```text
http://127.0.0.1:4173/my-first-example/
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
http://127.0.0.1:4173/pir-sensor/
http://127.0.0.1:4173/adt7410/
http://127.0.0.1:4173/sht30/
http://127.0.0.1:4173/ads1115/
```

Run Task **Serve examples**（[`tasks.json`](../../workspace/.vscode/tasks.json)）は URL 案内のみ。サーバは起動しない。Catalog の「実行」も同じ Example Server を開く。

## Reload して hardware を確認する

保存するたびに Example タブを reload する。GPIO / I2C 操作は Editor 内ではなく、Browser の Polyfill が Runtime の WebSocket へ接続する。

| 面 | 既定 | 上書き |
| --- | --- | --- |
| HTML Example | `ws://localhost:33330/` | script 前の `CHIRIMEN_WS_URL` |

既定の `localhost` は Browser が動いているマシンを指す。HTML Example を別マシンから開くときは `CHIRIMEN_WS_URL` を Pi の IP へ向ける（[browser-polyfill.md](./browser-polyfill.md)）。

```sh
curl http://127.0.0.1:33330/health
```

保存しても見た目や LED が変わらないときは [Example を保存しても Browser に反映されない](./troubleshooting.md#example-を保存しても-browser-に反映されない) を確認する。

## Runtime を診断する

診断の正本は [Runtime Diagnostics](./runtime-diagnostics.md) である。Catalog の「Runtime 確認」から GPIO LED Blink / GPIO Input / I2C Scan を開ける。Host は `./scripts/doctor.sh`、Server は `GET /health`。

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

```sh
curl http://127.0.0.1:33330/health
```

## 停止 / バックアップ

```sh
docker compose down
```

**`-v` は付けない。** named volume（password / 任意 Extension）が消える。workspace の bind mount（`workspace/`）は `-v` の有無に関わらず残る。

| 対象 | 置き場 | `docker compose down` | `docker compose down -v` |
| --- | --- | --- | --- |
| Example ソース | host `workspace/`（git / bind） | 残る | 残る |
| password / `config.yaml` | named volume `chirimen-editor-config` | 残る | 消える |
| 任意 Extension / user-data | named volume `chirimen-editor-local` | 残る | 消える |

`.env` と password は git に含めない。Example のバックアップは git を正とする。

Editor image は `codercom/code-server:<semver>` を pin する。`latest` は使わない。上げるときは Dockerfile / Compose の tag を更新する PR。host への npm インストールでは更新しない。

設定・workspace は named volume と bind mount に残る。image / container 再作成後も `config.yaml` / 任意 Extension / 編集中の Example は維持される（`down -v` しない場合）。方針は [Upgrade](../architecture/browser-editor.md#upgrade)。

Security:

- 既定は password 認証。対話の初回 `start.sh` で `.env` へ決める（#269）。`auth: none` は使わない
- 既定 bind は `127.0.0.1`。LAN は `./scripts/start.sh --lan`。Internet へは出さない。`--lan` でも password 必須
- HTTPS / reverse proxy は本リポジトリでは提供しない
- GPIO / I2C device は `chirimen-server` のみ。Editor / Examples / Catalog には渡さない
- 秘密情報は named volume または gitignored の `.env`。compose.yaml に `PASSWORD=` は書かない

詳細は [Authentication](../architecture/browser-editor.md#authentication) と [Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## 実機 E2E 検証（#243）

このガイドの `Learn → Edit → Save → Run → Verify` を Raspberry Pi 上で確認する。結果の正本は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243)。`Supported` とは書かない。

対象は可能な範囲で Raspberry Pi 3 B+ / 4 / 5 と Raspberry Pi OS 64-bit Desktop（Lite も可）。一次環境は Raspberry Pi 5（[#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219) と同一機）。

```sh
./scripts/doctor.sh
./scripts/start.sh            # 一次環境 Pi 5。Pi 3 B+ は --no-build
curl http://127.0.0.1:33330/health
```

1. `http://127.0.0.1:8080` で Editor を開く
2. Workspace の Example を編集・保存する
3. `http://127.0.0.1:4173/led-blink/` 等を reload する
4. 保存内容が反映されることを確認する
5. GPIO / I2C の既存 Example を可能な範囲で実機確認する
6. `http://127.0.0.1:4200/` で Catalog を開く
7. Catalog の「Runtime 確認」から Reference Examples を開けることを確認する

container 再起動後の保持:

```sh
docker compose down
./scripts/start.sh            # Pi 3 B+ は --no-build
```

host `./workspace` の変更は残る。**`-v` は付けない。** Catalog（`:4200`）は編集結果の確認先ではない。

記録項目と機種別の結果は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243) を正本とする。GPIO / I2C の回路は各 Example ガイドへ。

## Troubleshooting

汎用の切り分けは [Troubleshooting](./troubleshooting.md#browser-development-の切り分け) を正とする。ここでは索引だけ書く。

| 症状 | 参照 |
| --- | --- |
| Pi 3 B+ の on-device Docker build | [Pi 3 B+ の on-device Docker build は Unsupported](./troubleshooting.md#pi-3-b-の-on-device-docker-build-は-unsupported) |
| Pi 4 / Pi 5 でビルドが OOM / 熱 | [Pi 4 / Pi 5 で Docker ビルドが OOM / killed](./troubleshooting.md#pi-4--pi-5-で-docker-ビルドが-oom-killed)（`swap.sh`） |
| Pi 3 B+ で Editor が重い | [Pi 3 B+ で Editor が重い / メモリ不足](./troubleshooting.md#pi-3-b-で-editor-が重い--メモリ不足) |
| Editor で保存できない | [Editor で Example が保存できない](./troubleshooting.md#editor-で-example-が保存できないpermission-denied) |
| password / 設定が消えた | [Editor の password / 設定が消えた](./troubleshooting.md#editor-の-password-設定が消えた) |
| 8080 が開かない | [Editor（8080）が開かない](./troubleshooting.md#editor8080が開かない) |
| 4173 が開かない | [Example の静的サーバ（4173）が開かない](./troubleshooting.md#example-の静的サーバ4173が開かない) |
| 4200 が開かない | [Example Catalog（4200）が開かない](./troubleshooting.md#example-catalog4200が開かない) |
| Example は開くが GPIO / I2C が動かない | [Example は開くが GPIO / I2C が動かない](./troubleshooting.md#example-は開くが-gpio-i2c-が動かない) |
| LAN から届かない | [LAN から Editor / Catalog に届かない](./troubleshooting.md#lan-から-editor-catalog-に届かない) |
| Microsoft Marketplace の拡張が入れられない | [Editor で Microsoft Marketplace の拡張が入れられない](./troubleshooting.md#editor-で-microsoft-marketplace-の拡張が入れられない) |
| 保存しても Browser に反映されない | [Example を保存しても Browser に反映されない](./troubleshooting.md#example-を保存しても-browser-に反映されない) |
| 実機 E2E の記録を見る | [実機 E2E 検証（#243）](#実機-e2e-検証243)。結果は [Compatibility](../architecture/compatibility.md#browser-development-flow-実機検証243) |

配線・LED / スイッチ / I2C Scan 固有の切り分けは各 Example ガイドへ。

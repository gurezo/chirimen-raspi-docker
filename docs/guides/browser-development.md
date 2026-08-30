# Browser Development Environment

初めて利用する人が Browser Editor を起動し、Example を編集・実行する手順。

関連:

- 親 Issue: [#172 Phase 8: Browser Development Environment](https://github.com/gurezo/chirimen-raspi-docker/issues/172)
- 子 Issue: [#183 Browser Development Environment の利用ガイドを作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/183)
- 選定・永続化・認証の正本: [browser-editor.md](../architecture/browser-editor.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)（clone と host 準備。このページの前）
- [Getting Started](./getting-started.md)（最短起動）
- [docs/examples/README.md](../examples/README.md)
- [Troubleshooting](./troubleshooting.md)

このガイドの手順だけで、Editor → Example 編集 → Web Demo / Runtime の開発フローを再現できる。

## 概要

Editor と CHIRIMEN Runtime は別 container である。Editor は Hardware Runtime ではない。GPIO / I2C は Browser Polyfill → WebSocket → `chirimen-server` → Node Runtime を経由する。Editor container へ `/dev/gpio*` / `/dev/i2c-1` は渡さない。

編集は Editor、実行は別 Browser タブ（HTML Example / Web Demo）である。

```text
./scripts/start.sh
  （同等: docker compose up）
↓
Browser で Editor を開く（http://127.0.0.1:8080）
↓
Example を編集（docs/examples）
↓
Web Demo を開く（http://127.0.0.1:4200/）
```

方針の詳細は [browser-editor.md](../architecture/browser-editor.md)。

## 前提

- Raspberry Pi 3 B+ / 4 / 5（3 A+ はスペック不足のため推奨環境外。詳細は [Compatibility matrix](../architecture/compatibility.md)）
- Raspbian OS 64-bit
- 32-bit OS はサポート対象外。`--32bit` は Runtime only で Editor は起動しない
- Docker と Docker Compose
- リポジトリを clone 済みであること。host 準備は [raspberry-pi-setup.md](./raspberry-pi-setup.md)

**Raspberry Pi 3 B+ のビルド前提は次の両方である。片方だけでは足りない。**

- **8GB swap**: 無いと Docker image をビルドできない。`sudo ./setups/swap.sh`（既定 8G）を `./scripts/start.sh` の前に実行する
- **CPU ファン**: ビルド中の熱暴走（スロットル / 停止）を防ぐために **必ず実装する**。電源投入前に装着する。特定型番は指定しない

Pi 4 / 5 の swap / ファンは任意。`Supported` とは書かない。手順は [raspberry-pi-setup.md](./raspberry-pi-setup.md) と [setups/README.md](../../setups/README.md)。

## 起動

推奨入口は `./scripts/start.sh`（host の uid と GPIO / I2C device mapping を渡す）。

```sh
chmod +x scripts/doctor.sh scripts/start.sh
./scripts/doctor.sh
./scripts/start.sh            # Runtime + Browser Editor + Examples + Web Demo
./scripts/start.sh --lan      # 同上。Editor / Example / Web Demo を LAN 公開
```

同等の Compose 直接起動は `docker compose up`。uid を渡さないと Editor は `1000` / `coder` になり、[Example が保存できない](./troubleshooting.md#editor-で-example-が保存できないpermission-denied) ことがある。

32-bit OS の `./scripts/start.sh --32bit` は Runtime only（サポート対象外）。

health:

```sh
curl http://localhost:33330/health
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

`/healthz` は JSON の `expired` でも HTTP 200 なら Editor プロセスは生存している。Runtime の応答例は [Getting Started](./getting-started.md)。

## Editor を開く

Browser で `http://127.0.0.1:8080` を開く。既定の host bind は `127.0.0.1`（同一ホスト / SSH port forward）。

Editor は password 認証である。初回 password は named volume `chirimen-editor-config` の `config.yaml` にある。

```sh
docker compose exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
```

任意で host の `.env`（gitignored。[`.env.example`](../../.env.example)）に `CHIRIMEN_EDITOR_PASSWORD` を置くと `./scripts/start.sh` が渡す。`auth: none` は使わない。

LAN の別マシンから開くときは `./scripts/start.sh --lan`。Internet へは出さない。方針は [Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## Workspace を開く

workspace は bind mount `./docs/examples` → `/home/coder/project` である。monorepo 全体は mount しない。`package.json` / `node_modules` は無い。`pnpm` / `nx` は Editor では使わない。

| ディレクトリ | Example |
| --- | --- |
| `led-blink/` | GPIO LED Blink |
| `button/` | GPIO Input / onchange |
| `i2c-scan/` | I2C Scan |

配置の正本は [docs/examples/README.md](../examples/README.md)。回路・配線は [gpio-led-blink.md](./gpio-led-blink.md) / [gpio-input.md](./gpio-input.md) / [i2c-scan.md](./i2c-scan.md)。

## Extension の導入 / 確認

プロジェクトは code-server / VS Code Extension をプリインストール・配布・推奨・必須にしない（[#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201)）。CHIRIMEN Runtime と bundled examples は Editor Extension を必要としない。

確認は、workspace の HTML / JS を開いて編集できることである。code-server 内蔵の HTML / CSS / JavaScript Language Features は Editor 本体の一部であり、プリインストール Extension ではない。

利用者が任意に入れる Extension は named volume `chirimen-editor-local` に残る。Marketplace は Open VSX / Coder gallery である。Microsoft Marketplace（GitHub Copilot など）は使えない。方針は [Extensions](../architecture/browser-editor.md#extensions)。

## Example を編集する

1. Editor で `led-blink/` / `button/` / `i2c-scan/` のファイルを編集して保存する
2. 別タブで HTML サンプルを開く（Compose `chirimen-examples` が起動済み）

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

Run Task **Serve examples**（[`tasks.json`](../examples/.vscode/tasks.json)）は URL 案内のみ。サーバは起動しない。

静的ファイルのため hot reload は無い。保存後に Example タブを reload する。配線と期待結果は各 Example ガイドへ。

## Web Demo を起動する

Web Demo も `./scripts/start.sh` で起動済みである。別タブで開く。

```text
http://127.0.0.1:4200/
http://127.0.0.1:4200/#/gpio-output
http://127.0.0.1:4200/#/gpio-input
http://127.0.0.1:4200/#/i2c-scan
```

Run Task **Open Web Demo** は URL 案内のみ。Compose 経路に hot reload は無い。再 build は image 再 build。タブは reload する。

host で Vite HMR（`pnpm nx serve web-demo`）を使うときは port 4200 が衝突するので、先に `docker compose stop chirimen-web-demo` する。既定手順にはしない。

## Runtime に接続する

GPIO / I2C 操作は Editor 内ではなく、Browser の Polyfill が Runtime の WebSocket へ接続する。

| 面 | 既定 | 上書き |
| --- | --- | --- |
| HTML Example | `ws://localhost:33330/` | script 前の `CHIRIMEN_WS_URL` |
| Web Demo | ページが localhost / `127.0.0.1` なら `ws://localhost:33330/` | それ以外の hostname なら `ws://<hostname>:33330/` |

Web Demo の接続状態が **Connected** なら Runtime に届いている。LAN では Pi の IP でページを開く。HTML Example を別マシンから開くときは `CHIRIMEN_WS_URL` を Pi の IP へ向ける（[browser-polyfill.md](./browser-polyfill.md)）。

```sh
curl http://localhost:33330/health
```

## 停止

```sh
docker compose down
```

**`-v` は付けない。** named volume（password / 任意 Extension）が消える。workspace の bind mount（`docs/examples`）は `-v` の有無に関わらず残る。

## 更新

Editor image は `codercom/code-server:<semver>` を pin する。`latest` は使わない。上げるときは Dockerfile / Compose の tag を更新する PR。host への npm インストールでは更新しない。

設定・workspace は named volume と bind mount に残る。image / container 再作成後も `config.yaml` / 任意 Extension / 編集中の Example は維持される（`down -v` しない場合）。方針は [Upgrade](../architecture/browser-editor.md#upgrade)。

## バックアップ

| 対象 | 置き場 | `docker compose down` | `docker compose down -v` |
| --- | --- | --- | --- |
| Example ソース | host `docs/examples`（git / bind） | 残る | 残る |
| password / `config.yaml` | named volume `chirimen-editor-config` | 残る | 消える |
| 任意 Extension / user-data | named volume `chirimen-editor-local` | 残る | 消える |

`.env` と password は git に含めない。Example のバックアップは git を正とする。

## Security

- 既定は password 認証。`auth: none` は使わない
- 既定 bind は `127.0.0.1`。LAN は `./scripts/start.sh --lan`。Internet へは出さない
- HTTPS / reverse proxy は本リポジトリでは提供しない
- GPIO / I2C device は `chirimen-server` のみ。Editor / Examples / Web Demo には渡さない
- 秘密情報は named volume または gitignored の `.env`。compose.yaml に `PASSWORD=` は書かない

詳細は [Authentication](../architecture/browser-editor.md#authentication) と [Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## Troubleshooting

汎用の切り分けは [troubleshooting.md](./troubleshooting.md) を正とする。ここでは索引だけ書く。

| 症状 | 参照 |
| --- | --- |
| Pi 3 B+ の Docker ビルドが OOM / killed | [Pi 3 B+ で Docker ビルドが OOM / killed](./troubleshooting.md#pi-3-b-で-docker-ビルドが-oom-killed)（8GB swap） |
| ビルド中に熱暴走 / ハング | [Pi 3 B+ でビルド中に熱暴走 / ハングする](./troubleshooting.md#pi-3-b-でビルド中に熱暴走-ハングする)（CPU ファン） |
| Editor で保存できない | [Editor で Example が保存できない](./troubleshooting.md#editor-で-example-が保存できないpermission-denied) |
| password / 設定が消えた | [Editor の password / 設定が消えた](./troubleshooting.md#editor-の-password-設定が消えた) |
| 8080 が開かない | [Editor（8080）が開かない](./troubleshooting.md#editor8080が開かない) |
| 4173 が開かない | [Example の静的サーバ（4173）が開かない](./troubleshooting.md#example-の静的サーバ4173が開かない) |
| 4200 が開かない | [Web Demo（4200）が開かない](./troubleshooting.md#web-demo4200が開かない) |
| Web Demo は開くが GPIO / I2C が動かない | [Web Demo は開くが GPIO / I2C が動かない](./troubleshooting.md#web-demo-は開くが-gpio-i2c-が動かない) |
| LAN から届かない | [LAN から Editor / Web Demo に届かない](./troubleshooting.md#lan-から-editor-web-demo-に届かない) |
| Microsoft Marketplace の拡張が入れられない | [Editor で Microsoft Marketplace の拡張が入れられない](./troubleshooting.md#editor-で-microsoft-marketplace-の拡張が入れられない) |
| 保存しても Browser に反映されない | [Example を保存しても Browser に反映されない](./troubleshooting.md#example-を保存しても-browser-に反映されない) |

配線・LED / スイッチ / I2C Scan 固有の切り分けは各 Example ガイドへ。

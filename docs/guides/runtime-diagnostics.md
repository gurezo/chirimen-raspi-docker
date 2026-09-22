# Runtime Diagnostics

Runtime / Browser Polyfill / GPIO / I2C の確認方法を、責務ごとに整理した正本です。現行の確認は `doctor.sh`、`GET /health`、Reference Examples である。`apps/web-demo` の診断 UI は [#263](https://github.com/gurezo/chirimen-raspi-docker/issues/263) で廃止し、これらのレイヤーへ移した。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#263 web-demo の機能を棚卸しし Example Catalog / Runtime Diagnostics へ統合した上で廃止する](https://github.com/gurezo/chirimen-raspi-docker/issues/263)
- [Getting Started](./getting-started.md)（3段階。CHIRIMEN Setup は Step 2: `doctor.sh` → `start.sh`）
- [Troubleshooting](./troubleshooting.md)
- [Browser Development Environment](./browser-development.md)
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築。`doctor.sh` 失敗時の戻先）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- 実機記録: [runtime-verification.md](../examples/runtime-verification.md)

Catalog は題材の発見入口であり、Hardware Runtime ではない。GPIO / I2C 操作は Runtime Example → Browser Polyfill → `chirimen-server` `:33330` が行う。

## 責務

`doctor.sh` は **CHIRIMEN Setup** の診断である。Host Setup 完了後に実行し、設定は変えない。失敗時は [Raspberry Pi Setup](./raspberry-pi-setup.md) の対応スクリプトへ戻る。`[error]` が無ければ [Getting Started の Step 2](./getting-started.md#step-2-chirimen-setup) で `./scripts/start.sh` へ進む。

```text
Host / Docker → scripts/doctor.sh
Server        → GET /health
Browser       → Runtime Examples
GPIO Output   → GPIO LED Blink
GPIO Input    → GPIO Input
I2C           → I2C Scan
Device        → Example Catalog / Runtime Examples
```

| レイヤー | 確認するもの | 確認しないもの |
| --- | --- | --- |
| `./scripts/doctor.sh` | Raspberry Pi / OS / architecture、Memory / Swap、I2C、`/dev/i2c-*`、Docker Engine、Docker Compose、Host capability（`/sys/class/gpio`、`/dev/gpiomem*`、`/dev/gpiochip*`、`/dev/i2c-1`） | WebSocket、Browser Polyfill、GPIO の点滅。Host 設定の変更 |
| `GET /health`（`:33330`） | `chirimen-server` の起動状態 | GPIO / I2C の E2E、Browser からの疎通 |
| GPIO LED Blink | Browser Polyfill / WebSocket / GPIO Output | Host の Docker インストール |
| GPIO Input | Browser Polyfill / WebSocket / GPIO Input | I2C |
| I2C Scan | Browser Polyfill / WebSocket / I2C Runtime / `/dev/i2c-1` | 個別 slave の読み書き（ADT7410 等は別 Example） |

`doctor.sh` は sudo 不要である。結果は `[ok]` / `[error]` / `[warn]`。末尾に server startup と同じ語彙の `[ capabilities ] gpio=... i2c=...` が出る。`[error]` がある場合は exit 1。`swap.sh --check` は呼ばない（root が必要なため）。Memory / Swap は `/proc/meminfo` を読む。

問題時の戻先（doctor は修復しない）:

| 問題 | 戻先 |
| --- | --- |
| Swap problem | `sudo ./setups/swap.sh` → `sudo ./setups/swap.sh --check` |
| I2C unavailable | `sudo ./setups/enable-i2c.sh` → `sudo reboot` → `./setups/enable-i2c.sh --check` |
| Docker unavailable | `./setups/docker.sh` |
| Compose unavailable | `./setups/docker-compose.sh` |

- **GPIO `sysfs`**: `/sys/class/gpio` があり、現行 backend で利用可能
- **GPIO `gpiochip`**: sysfs が無く `/dev/gpiochip*` のみ → `[warn]` + unsupported（backend 未実装）
- **GPIO `unavailable`**: GPIO interface が無い → `[warn]`
- **I2C `available`**: `/dev/i2c-1` がある → `[ok] I2C: available (/dev/i2c-1)` と `i2c backend: i2c-dev`
- **I2C `unavailable`**: `/dev/i2c-1` が無い → `[error] I2C: unavailable`。doctor 自身は設定を変えない。有効化は [Raspberry Pi Setup](./raspberry-pi-setup.md) の `enable-i2c.sh`
- **Swap**: SwapTotal=0 なら `[warn]`（任意）。主用途は Pi 4 / Pi 5 の Docker build。Runtime-only では必須ではない。Pi 3 B+ build の有効化手段ではない（[Compatibility](../architecture/compatibility.md)）
- **非 Pi 環境**: Pi / device 関連が `[error]` / `[warn]` になる

## 歴史的経緯（#263 で廃止した web-demo）

これは現行の確認手順ではない。#263 で廃止した `apps/web-demo` が持っていた機能と、移行先の記録である。

| 機能 | 分類 | 移行先 |
| --- | --- | --- |
| Browser Polyfill 接続確認 | Example で代替 | `workspace/led-blink/` など Reference Examples |
| WebSocket / Runtime 接続状態 UI | Example / health で代替 | 各 Example のエラー表示 + `GET /health` |
| GPIO Output | Example で代替 | GPIO LED Blink `http://127.0.0.1:4173/led-blink/` |
| GPIO Input | Example で代替 | GPIO Input `http://127.0.0.1:4173/button/` |
| I2C Scan | Example で代替 | I2C Scan `http://127.0.0.1:4173/i2c-scan/` |
| I2C Device 操作 | 不要（当時 web-demo に無かった） | 既存 ported Example（ADT7410 等） |
| エラー表示 | Example / docs で代替 | Example ページ + [Troubleshooting](./troubleshooting.md) |
| 診断ナビ（3 画面への導線） | Catalog へ移行 | Example Catalog の「Runtime 確認」 |
| LAN の WS hostname 自動解決 | Example で代替 | 既存 `CHIRIMEN_WS_URL`（[browser-polyfill.md](./browser-polyfill.md)） |
| Host / Docker 診断 | doctor.sh で代替 | [`scripts/doctor.sh`](../../scripts/doctor.sh) |

接続状態の色付きラベルや Start / Stop 専用シェルは Catalog に移植しない。Catalog は polyfill に依存しない発見 UI のままにする。

## Reference Examples（smoke test）

次の 3 件を基本動作確認用 Example とする。新規 Example は作らない。配線と操作は各ガイド、機別記録は [runtime-verification.md](../examples/runtime-verification.md)。

| 確認 | Example | URL | 配線 |
| --- | --- | --- | --- |
| GPIO Output | GPIO LED Blink | `http://127.0.0.1:4173/led-blink/` | [回路仕様](../examples/gpio-led-blink.md) |
| GPIO Input | GPIO Input | `http://127.0.0.1:4173/button/` | [回路仕様](../examples/gpio-input.md) |
| I2C Runtime | I2C Scan | `http://127.0.0.1:4173/i2c-scan/` | [検証仕様](../examples/i2c-scan.md)。検証用 slave は ADT7410（`0x48`） |

これらで `Browser → Browser Polyfill → WebSocket → chirimen-server → GPIO/I2C` の基本経路を確認する。

## 手順

1. CHIRIMEN Setup として Host を診断する。

```sh
./scripts/doctor.sh
```

`[error]` が無ければ次へ進む。不足があるときは上の戻先表と [Raspberry Pi Setup](./raspberry-pi-setup.md) へ戻る。起動手順の正本は [Getting Started の Step 2](./getting-started.md#step-2-chirimen-setup)。

2. Runtime を起動し、プロセス生存を確認する。

```sh
./scripts/start.sh
curl -fsS http://127.0.0.1:33330/health
```

期待する応答の形:

```json
{"name":"chirimen-raspi-docker-server","status":"ok","version":"0.0.1"}
```

`status` が `ok` でも GPIO / I2C の E2E は保証しない。

3. Example Catalog で題材を探す。ported の「実行」は Example Server `:4173`。Catalog の「Runtime 確認」から 3 件の Reference Example を開ける。

4. ブラウザで Reference Example を開き、配線した回路で動作を確認する。Runtime 未接続時はページ上にエラーが出る。LAN から開くときは [browser-polyfill.md](./browser-polyfill.md) の `CHIRIMEN_WS_URL` を使う。

詰まったときの切り分けは [Troubleshooting](./troubleshooting.md)。

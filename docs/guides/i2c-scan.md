# I2C Scan

初めての利用者が、HTML サンプルで I2C bus 上の address を確認する手順。Runtime の疎通確認は [Runtime Diagnostics](./runtime-diagnostics.md)。

関連:

- 親 Issue: [#52 I2C Scan example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/52)
- 子 Issue: [#117 I2C Scan guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/117)
- HTML サンプル: [workspace/i2c-scan/](../../workspace/i2c-scan/)
- 検証仕様（正本）: [i2c-scan.md](../examples/i2c-scan.md)
- [Raspberry Pi Setup](./raspberry-pi-setup.md)
- [Getting Started](./getting-started.md)（Runtime 起動は Step 2: `docker compose up -d`）
- [Browser Development Environment](./browser-development.md)
- 実機 E2E: [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（I2C を学ぶ）
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-drivers `@chirimen/adt7410`](https://github.com/chirimen-oh/chirimen-drivers/tree/master/packages/adt7410)（address `0x48`。本ガイドでは scan のみ）

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の I2C1 を走査し、検証用 slave（ADT7410）の address `0x48` を Browser で確認できる。ADT7410 の温度読み取りなど、特定センサの機能 Example は対象外。

Scan は Public polyfill に無い Demo-only である。学習・編集の入口は HTML サンプル（`workspace/i2c-scan/`、確認先 `http://127.0.0.1:4173/i2c-scan/`）。同じ `requestI2CAccess` → `open` + `writeByte(0x00)` で合成する。呼び出し経路は [protocol.md の I2C Scan API flow](../architecture/protocol.md#i2c-scan-api-flow114)。

## 学ぶ

I2C の考え方は [CHIRIMEN Tutorial](./chirimen-tutorial.md) で学ぶ。優先は [センサーを使ってみよう](https://tutorial.chirimen.org/raspi/section2)。配線ピン・I2C 有効化・Runtime 起動はこのガイドと [検証仕様](../examples/i2c-scan.md) を正本とする。

本ガイドの完了条件は address `0x48` の検出である。Tutorial の温度センサー Example（ADT7410 / SHT30 の `read()`）は別物であり、ここでは実行しない。

Tutorial の SD イメージや `/home/pi/Desktop/gc/` の手順は使わない。

## I2C 有効化

Raspberry Pi の I2C は初期状態で無効なことがある。host で有効化してから reboot する。

```sh
chmod +x setups/enable-i2c.sh
sudo ./setups/enable-i2c.sh
sudo reboot
./setups/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認する。sudo は不要。**reboot が必要**。詳細と手動手順（`raspi-config` / boot config）は [Raspberry Pi Setup](./raspberry-pi-setup.md) を参照する。I2C → Docker → Runtime の実機確認は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。

## /dev/i2c-1 確認

host で device があることを確認する。

```sh
ls -l /dev/i2c-1
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`/dev/i2c-1` が存在し、doctor が `[ok] I2C: available (/dev/i2c-1)` を出せば次へ進む。`[error] I2C: unavailable` の場合は上の「I2C 有効化」に戻る。doctor は診断のみで I2C 設定は変更しない。

任意（`i2c-tools` がある場合）:

```sh
sudo apt install i2c-tools
i2cdetect -y 1
```

ADT7410 を接続済みなら `48` が出る。未接続なら空でも、この時点では次の配線へ進んでよい。

## device 接続

検証用 slave は **ADT7410**（expected `0x48`）。配線の正本は [検証仕様](../examples/i2c-scan.md)。

必要部品:

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| ADT7410 | 1 | I2C 温度センサ。A0 / A1 を GND にして address `0x48` |
| ジャンパワイヤ | 4 本以上 | SDA / SCL / 3.3V / GND へ |

モジュールに pull-up が無い場合は、SDA / SCL に 4.7kΩ を 3.3V へ上げる。多くの breakout は onboard pull-up 付き。

3.3V I2C1。`writeByte(0x00)` に応答すれば scan 成功（温度レジスタは読まない）。

| 役割 | BCM | 40-pin header 物理 pin |
| --- | --- | --- |
| SDA | `2` | `3` |
| SCL | `3` | `5` |
| 3.3V | — | `1` |
| GND | — | `6` |

```text
3.3V (物理 pin 1)
  → ADT7410 VDD

SDA (物理 pin 3 / BCM 2)
  → ADT7410 SDA

SCL (物理 pin 5 / BCM 3)
  → ADT7410 SCL

GND (物理 pin 6)
  → ADT7410 GND
  → ADT7410 A0
  → ADT7410 A1
```

手順:

1. ADT7410 の **VDD** を **物理 pin 1**（3.3V）へ接続する
2. **SDA** を **物理 pin 3**（BCM 2）へ接続する
3. **SCL** を **物理 pin 5**（BCM 3）へ接続する
4. **GND** と **A0** / **A1** を **物理 pin 6**（GND）へ接続する

禁止:

- **5V ピン**（物理 pin 2 / 4）へ VDD や SDA / SCL を接続しない
- 5V ロジックの I2C device をレベルシフト無しで接続しない
- A0 / A1 を 3.3V に上げたまま `0x48` を期待しない（address が変わる）

Pi 3 / 4 / 5 で配線を変える必要はない。GPIO LED Blink（BCM 26 / 物理 pin 37）および GPIO Input（BCM 5 / 物理 pin 29）とはピンが重ならない。同時配線できる。ピン対応の根拠は [検証仕様](../examples/i2c-scan.md) を参照する。

## Runtime 起動

Raspberry Pi 上で CHIRIMEN Runtime を起動する。[Raspberry Pi Setup](./raspberry-pi-setup.md)（Host / Getting Started Step 1）のあと、[Getting Started の Step 2](./getting-started.md#step-2-start-runtime) の `docker compose up -d` を使う。

```sh
docker compose up -d
```

別ターミナルで health を確認する。

```sh
curl http://127.0.0.1:33330/health
```

期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```

container 内に I2C device が見えることも確認する。

```sh
docker compose exec chirimen-server ls -l /dev/i2c-1
```

詳細は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime) を参照する。Development / device mapping が必要なときの `start.sh` は [scripts/README.md](../../scripts/README.md)。

## Scan 操作

サンプルは同じディレクトリの `polyfill.js` と `main.js` を HTML から読む。`file://` ではなく HTTP で開く（WebSocket 先は `ws://localhost:33330/`）。主経路は Example Catalog から Example Server を開くことである（`docker compose up -d` 済み前提）。

1. Example Catalog: `http://127.0.0.1:4200/`
2. ported の「実行」、または直接 `http://127.0.0.1:4173/i2c-scan/`

編集する場合は Catalog の「編集」で Editor `:8080` を開き、host `workspace/i2c-scan/` に Save する。標準操作は `Edit → Save → Browser reload` である。Catalog（`:4200`）は編集結果を表示しない。保存先と共有 workspace は [Workspace を開く](./browser-development.md#workspace-を開く)。Run Task **Serve examples** は URL 案内である。

`polyfill.js` はサンプルに同梱する。polyfill を更新したらリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する（`workspace/i2c-scan/polyfill.js` へコピーされる）。ページ表示と同時に走査が始まる（Scan ボタンは無い）。検出 address は hex 一覧になる。

Compose の Example Server を使わないときの退避:

```sh
cd workspace/i2c-scan
python3 -m http.server 4173
```

この場合の確認先は `http://localhost:4173/` である（subdirectory を document root にするためパスは `/`）。Compose 主経路は `http://127.0.0.1:4173/i2c-scan/`。

走査は I2C bus 1（`ports.get(1)`）を `0x03`–`0x77` で `open` + `writeByte(0x00)` する。詳細は [browser-polyfill.md](./browser-polyfill.md)。

Runtime 確認は [Runtime Diagnostics](./runtime-diagnostics.md)。HTML サンプルは `http://127.0.0.1:4173/i2c-scan/`。

## 結果の読み方

HTML サンプルはページ表示で走査し、ステータスが「走査中」から「N 件」になる。

| UI | 意味 |
| --- | --- |
| 走査中 | `0x03`–`0x77` を順に probe している |
| N 件 | 走査が完了した。一覧の件数が N |

一覧の各行は `0x48` 形式（2 桁 hex）。本 example の成功条件は、一覧に **`0x48`** が含まれること。他の address が出ても `0x48` があれば可。

空一覧は本 example では失敗である。配線と I2C 有効化を見直す。slave 未接続時の空配列は Runtime 確認（[#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99)）では正常なことがあるが、このガイドの完了条件ではない。

ADT7410 の温度レジスタは読まない。scan で address が分かれば十分である。

## Troubleshooting

汎用の起動・device 障害は [Troubleshooting](./troubleshooting.md) を参照する。ここでは I2C Scan 固有の切り分けだけを書く。

### `polyfill.js` が 404 になる

`workspace/i2c-scan/polyfill.js` がディレクトリにあることを確認する。Compose 経由なら `http://127.0.0.1:4173/i2c-scan/` を開いているか見る。`python3 -m http.server` の退避を使うときはカレントディレクトリが `workspace/i2c-scan` であること。欠けている場合はリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する。

### address が出ない / 空一覧になる

| 確認 | 対処 |
| --- | --- |
| I2C が無効 | `sudo ./setups/enable-i2c.sh` → reboot → `--check`。[Raspberry Pi Setup](./raspberry-pi-setup.md) |
| host に `/dev/i2c-1` が無い | `ls -l /dev/i2c-1` と `./scripts/doctor.sh` |
| container に `/dev/i2c-1` が無い | `docker compose up -d`（device mapping が必要なら `./scripts/start.sh`。Pi 3 B+ は `--no-build`）し直し、`docker compose exec chirimen-server ls -l /dev/i2c-1` |
| Runtime が止まっている | `docker compose up -d` と `curl http://127.0.0.1:33330/health` |
| ピン取り違え | 物理 pin 1（3.3V）、pin 3（SDA）、pin 5（SCL）、pin 6（GND） |
| A0 / A1 が GND でない | A0 / A1 を GND へ。上げると address が `0x48` 以外になる |
| 5V 接続 | VDD / SDA / SCL を 5V ピン（2 / 4）へつながない |
| 非 Pi 環境 | macOS などでは実 I2C が無い。Raspberry Pi 上で開く |
| 別マシンのブラウザ | Editor / Example / Catalog は既定で `127.0.0.1` のみ。LAN は `./scripts/start.sh --lan`。HTML は `CHIRIMEN_WS_URL` で WS 接続する（[browser-polyfill.md](./browser-polyfill.md)） |

### `open` が Permission denied になる

I2C device の mount と権限の問題。[Troubleshooting](./troubleshooting.md) の「Permission denied」を参照する。

### Scan 中に画面を離すと一覧が消える

画面離脱 / reload / WebSocket 切断で走査を中断し、結果を捨てる。再度走査するときは HTML サンプルを開き直す。

# I2C Scan

初めての利用者が、HTML サンプルまたは web-demo の I2C Scan で bus 上の address を確認する手順。

関連:

- 親 Issue: [#52 I2C Scan example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/52)
- 子 Issue: [#117 I2C Scan guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/117)
- HTML サンプル: [docs/examples/i2c-scan/](../examples/i2c-scan/)
- 検証仕様（正本）: [i2c-scan.md](../examples/i2c-scan.md)
- [Getting Started](./getting-started.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-drivers `@chirimen/adt7410`](https://github.com/chirimen-oh/chirimen-drivers/tree/master/packages/adt7410)（address `0x48`。本ガイドでは scan のみ）

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の I2C1 を走査し、検証用 slave（ADT7410）の address `0x48` を Browser で確認できる。ADT7410 の温度読み取りなど、特定センサの機能 Example は対象外。

Scan は Public polyfill に無い Demo-only である。入口は HTML サンプル（`docs/examples/i2c-scan/`）または web-demo の `#/i2c-scan`。どちらも `requestI2CAccess` → `open` + `writeByte(0x00)` で合成する。呼び出し経路は [protocol.md の I2C Scan API flow](../architecture/protocol.md#i2c-scan-api-flow114)。

## I2C 有効化

Raspberry Pi の I2C は初期状態で無効なことがある。host で有効化してから reboot する。

```sh
chmod +x scripts/enable-i2c.sh
sudo ./scripts/enable-i2c.sh
sudo reboot
sudo ./scripts/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認する。**reboot が必要**。詳細と手動手順（`raspi-config` / boot config）は [raspberry-pi-setup.md](./raspberry-pi-setup.md) を参照する。

## /dev/i2c-1 確認

host で device があることを確認する。

```sh
ls -l /dev/i2c-1
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`/dev/i2c-1` が存在し、doctor の I2C が `[error]` でなければ次へ進む。無い場合は上の「I2C 有効化」に戻る。

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

Raspberry Pi 上で CHIRIMEN Runtime を起動する。host の事前準備がまだなら [raspberry-pi-setup.md](./raspberry-pi-setup.md) を先に完了する。

```sh
git clone https://github.com/gurezo/chirimen-raspi-docker.git
cd chirimen-raspi-docker
chmod +x scripts/doctor.sh scripts/start.sh
./scripts/doctor.sh
./scripts/start.sh
```

`[error]` が無ければ Runtime を起動する。別ターミナルで health を確認する。

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

container 内に I2C device が見えることも確認する。

```sh
docker compose exec chirimen-server ls -l /dev/i2c-1
```

詳細は [Getting Started](./getting-started.md) を参照する。

## Scan 操作

サンプルは同じディレクトリの `polyfill.js` と `main.js` を HTML から読む。`file://` ではなく HTTP で開く（WebSocket 先は `ws://localhost:33330/`）。

```sh
cd docs/examples/i2c-scan
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開く。ページ表示と同時に走査が始まる（Scan ボタンは無い）。検出 address は hex 一覧になる。`polyfill.js` はサンプルに同梱する。polyfill を更新したらリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する（`docs/examples/i2c-scan/polyfill.js` へコピーされる）。

Browser Editor から編集する場合は `./scripts/start.sh --editor` のあと、Run Task **Serve examples**。`http://127.0.0.1:4173/i2c-scan/` を開き、保存後に Example タブを reload する。手順は [Getting Started](./getting-started.md) と [docs/examples/README.md](../examples/README.md)。

走査は I2C bus 1（`ports.get(1)`）を `0x03`–`0x77` で `open` + `writeByte(0x00)` する。詳細は [browser-polyfill.md](./browser-polyfill.md)。

代替（web-demo の Scan / Stop）:

```sh
pnpm nx serve web-demo
```

1. I2C 有効化、`/dev/i2c-1` 確認、device 接続、Runtime 起動を完了する
2. ブラウザで `http://localhost:4200/#/i2c-scan` を Raspberry Pi 上で開く
3. 接続状態が **Connected** になるまで待つ（Runtime が止まっていると `Error`）
4. **Scan** を押す。走査中はボタンが無効になり、ステータスが「走査中」になる
5. 完了すると検出 address が hex 一覧で出る。画面離脱 / reload / WebSocket 切断で走査は中断する

## 結果の読み方

HTML サンプルはページ表示で走査し、ステータスが「走査中」から「N 件」になる。web-demo は Scan ボタンを使う。

| UI | 意味 |
| --- | --- |
| 走査中 | `0x03`–`0x77` を順に probe している。web-demo では Scan ボタンが無効 |
| N 件 | 走査が完了した。一覧の件数が N |
| 停止中 | web-demo のみ。未実行、または画面離脱 / 切断で中断した |

一覧の各行は `0x48` 形式（2 桁 hex）。本 example の成功条件は、一覧に **`0x48`** が含まれること。他の address が出ても `0x48` があれば可。

空一覧は本 example では失敗である。配線と I2C 有効化を見直す。slave 未接続時の空配列は Runtime 確認（[#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99)）では正常なことがあるが、このガイドの完了条件ではない。

ADT7410 の温度レジスタは読まない。scan で address が分かれば十分である。

## Troubleshooting

汎用の起動・device 障害は [troubleshooting.md](./troubleshooting.md) を参照する。ここでは I2C Scan 固有の切り分けだけを書く。

### `polyfill.js` が 404 になる

`docs/examples/i2c-scan/polyfill.js` がディレクトリにあることを確認する。Editor から配信しているときは `http://127.0.0.1:4173/i2c-scan/` を開いているかも見る。欠けている場合はリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する。

### Scan を押しても address が出ない / 空一覧になる

| 確認 | 対処 |
| --- | --- |
| I2C が無効 | `sudo ./scripts/enable-i2c.sh` → reboot → `--check`。[raspberry-pi-setup.md](./raspberry-pi-setup.md) |
| host に `/dev/i2c-1` が無い | `ls -l /dev/i2c-1` と `./scripts/doctor.sh` |
| container に `/dev/i2c-1` が無い | `./scripts/start.sh` し直し、`docker compose exec chirimen-server ls -l /dev/i2c-1` |
| Runtime が止まっている / 接続が Error | `./scripts/start.sh` と `curl http://localhost:33330/health`。接続状態が **Connected** になってから Scan する |
| ピン取り違え | 物理 pin 1（3.3V）、pin 3（SDA）、pin 5（SCL）、pin 6（GND） |
| A0 / A1 が GND でない | A0 / A1 を GND へ。上げると address が `0x48` 以外になる |
| 5V 接続 | VDD / SDA / SCL を 5V ピン（2 / 4）へつながない |
| 非 Pi 環境 | macOS などでは実 I2C が無い。Raspberry Pi 上で開く |
| 別マシンのブラウザ | 既定の接続先は `ws://localhost:33330/`。Pi 上で開くか、script の前に `CHIRIMEN_WS_URL` を設定する（[browser-polyfill.md](./browser-polyfill.md)） |

### `open` が Permission denied になる

I2C device の mount と権限の問題。[troubleshooting.md](./troubleshooting.md) の「Permission denied」を参照する。

### Scan 中に画面を離すと一覧が消える

画面離脱 / reload / WebSocket 切断で走査を中断し、結果を捨てる。再 Scan するときは `#/i2c-scan` に戻り、接続状態が **Connected** になってから Scan を押す。

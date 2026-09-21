# GPIO LED Blink

初めての利用者が、旧 CHIRIMEN LEDblink と同じ HTML サンプルで LED 点滅を再現する手順。

関連:

- 親 Issue: [#50 GPIO LED Blink example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/50)
- 子 Issue: [#108 LED Blink guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/108)
- 回路仕様（正本）: [gpio-led-blink.md](../examples/gpio-led-blink.md)
- HTML サンプル: [workspace/led-blink/](../../workspace/led-blink/)
- [Getting Started](./getting-started.md)（Step 3 の入口。Runtime 起動は Step 2）
- [Browser Development Environment](./browser-development.md)
- 実機 E2E: [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [CHIRIMEN Tutorial](./chirimen-tutorial.md)（GPIO / 回路を学ぶ）
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-oh/chirimen gc/gpio/LEDblink](https://github.com/chirimen-oh/chirimen/tree/master/gc/gpio/LEDblink)

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の GPIO26 を 1 秒間隔で点滅できる。

## 学ぶ

GPIO / L チカ / LED 極性の概念は [CHIRIMEN Tutorial](./chirimen-tutorial.md) で学ぶ。優先は [L チカしてみよう](https://tutorial.chirimen.org/raspi/section0)。配線ピン・抵抗値・Runtime 起動はこのガイドと [回路仕様](../examples/gpio-led-blink.md) を正本とする。

Tutorial の SD イメージや `/home/pi/Desktop/gc/` の手順は使わない。

## 必要部品

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| LED | 1 | 一般的な 3 mm / 5 mm。赤を想定（Vf 約 2.0 V） |
| 電流制限抵抗 | 1 | **330Ω**（推奨）。1 kΩ でも可（より暗い） |
| ジャンパワイヤ | 2 本以上 | GPIO26 と GND へ |

詳細な電流計算は [回路仕様](../examples/gpio-led-blink.md) を参照する。

## 配線

current source / active HIGH。`write(1)` で点灯、`write(0)` で消灯。

| 役割 | BCM（`ports.get`） | 40-pin header 物理 pin |
| --- | --- | --- |
| GPIO output | `26` | `37` |
| GND | — | `39` |

```text
GPIO26 (物理 pin 37)
  → 330Ω
  → LED アノード（長い足）
  → LED カソード（短い足）
  → GND (物理 pin 39)
```

手順:

1. 抵抗の一端を **物理 pin 37**（BCM 26）へ接続する
2. 抵抗の他端を LED の **アノード**（長い足）へ接続する
3. LED の **カソード**（短い足）を **物理 pin 39**（GND）へ接続する

禁止:

- **抵抗なし**で LED を GPIO に接続しない
- **5V ピン**（物理 pin 2 / 4）へ接続しない
- GPIO 同士を短絡しない

Pi 3 / 4 / 5 で配線を変える必要はない。ピン対応の根拠は [回路仕様](../examples/gpio-led-blink.md) を参照する。

## Runtime 起動

Raspberry Pi 上で CHIRIMEN Runtime を起動する。[Raspberry Pi Setup](./raspberry-pi-setup.md)（Host / Getting Started Step 1）のあと、[Getting Started の Step 2](./getting-started.md#step-2-chirimen-setup)（`doctor.sh` → `start.sh`）を使う。このガイドは Getting Started Step 3 の詳細正本である。

```sh
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

詳細は [Getting Started の Step 2](./getting-started.md#step-2-chirimen-setup) を参照する。

## Browser 起動

サンプルは旧 LEDblink と同じく、同じディレクトリの `polyfill.js` と `main.js` を HTML から読む。`file://` ではなく HTTP で開く（WebSocket 先は `ws://localhost:33330/`）。主経路は Example Catalog から Example Server を開くことである（`./scripts/start.sh` 済み前提）。

1. Example Catalog: `http://127.0.0.1:4200/`
2. ported の「実行」、または直接 `http://127.0.0.1:4173/led-blink/`

編集する場合は Catalog の「編集」で Editor `:8080` を開き、host `workspace/led-blink/` に Save する。標準操作は `Edit → Save → Browser reload` である。Catalog（`:4200`）は編集結果を表示しない。保存先と共有 workspace は [Workspace を開く](./browser-development.md#workspace-を開く)。Run Task **Serve examples** は URL 案内である。

`polyfill.js` はサンプルに同梱する。polyfill を更新したらリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する（`workspace/led-blink/polyfill.js` へコピーされる）。

Compose の Example Server を使わないときの退避:

```sh
cd workspace/led-blink
python3 -m http.server 4173
```

この場合の確認先は `http://localhost:4173/` である（subdirectory を document root にするためパスは `/`）。Compose 主経路は `http://127.0.0.1:4173/led-blink/`。

`index.html` の読み込み順:

```html
<script src="./polyfill.js"></script>
<script src="./main.js" defer></script>
```

`main.js` は初回の `navigator.requestGPIOAccess()` で Runtime へ接続する。

## 操作手順

1. 配線と Runtime 起動、Browser 起動を完了する
2. Catalog から「実行」するか、`http://127.0.0.1:4173/led-blink/` を Raspberry Pi 上のブラウザで開く
3. ページ表示と同時に GPIO26 の点滅が始まる（Start ボタンは無い）
4. タブを閉じると点滅は止まる。サンプルは旧 LEDblink と同じ無限ループのためクライアントでは `unexport` しない。GPIO の解放はサーバが WebSocket 切断時に行う

Runtime 確認は [Runtime Diagnostics](./runtime-diagnostics.md)。HTML サンプルは `http://127.0.0.1:4173/led-blink/`。

## 期待結果

- ページを開くと LED が **1 秒間隔**で点灯 / 消灯する
- `write(1)` で点灯、`write(0)` で消灯（active HIGH）
- タブを閉じたあと、同じ GPIO26 を再度 `export` できる（HTML サンプルを開き直す）

## Troubleshooting

汎用の起動・device 障害は [Troubleshooting](./troubleshooting.md) を参照する。ここでは GPIO LED Blink 固有の切り分けだけを書く。

### `polyfill.js` が 404 になる

`workspace/led-blink/polyfill.js` がディレクトリにあることを確認する。Compose 経由なら `http://127.0.0.1:4173/led-blink/` を開いているか見る。`python3 -m http.server` の退避を使うときはカレントディレクトリが `workspace/led-blink` であること。欠けている場合はリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する。

### ページは開くが LED が点かない / エラーが出る

| 確認 | 対処 |
| --- | --- |
| Runtime が止まっている | `./scripts/start.sh` と `curl http://localhost:33330/health` |
| LED の極性 | アノード（長い足）が抵抗側、カソードが GND |
| ピン取り違え | 物理 pin 37（BCM 26）と pin 39（GND）。5V ピン（2 / 4）は使わない |
| 非 Pi 環境 | macOS などでは実 GPIO が無い。Raspberry Pi 上で開く |
| 別マシンのブラウザ | Editor / Example / Catalog は既定で `127.0.0.1` のみ。LAN は `./scripts/start.sh --lan`。HTML は `CHIRIMEN_WS_URL` で WS 接続する（[browser-polyfill.md](./browser-polyfill.md)） |

### `export` が Permission denied / EROFS になる

GPIO device の mount と sysfs の書き込み経路の問題。[Troubleshooting](./troubleshooting.md) の「Permission denied」と「GPIO export で EROFS」を参照する。

### タブを閉じたあと、同じ GPIO26 を再度使えない

HTML サンプルは旧 LEDblink と同じ無限ループのため、クライアント側では `unexport` しない。タブを閉じると WebSocket が切れ、サーバが GPIO を解放する。それでも使えない場合は container を再作成してからページを開き直す。

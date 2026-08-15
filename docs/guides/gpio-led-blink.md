# GPIO LED Blink

初めての利用者が、旧 CHIRIMEN LEDblink と同じ HTML サンプルで LED 点滅を再現する手順。

関連:

- 親 Issue: [#50 GPIO LED Blink example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/50)
- 子 Issue: [#108 LED Blink guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/108)
- 回路仕様（正本）: [gpio-led-blink.md](../examples/gpio-led-blink.md)
- HTML サンプル: [docs/examples/led-blink/](../examples/led-blink/)
- [Getting Started](./getting-started.md)
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-oh/chirimen gc/gpio/LEDblink](https://github.com/chirimen-oh/chirimen/tree/master/gc/gpio/LEDblink)

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の GPIO26 を 1 秒間隔で点滅できる。

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

詳細は [Getting Started](./getting-started.md) を参照する。

## Browser 起動

サンプルは旧 LEDblink と同じく、生成した `polyfill.js` と `main.js` を HTML から読む。`file://` ではなく HTTP で開く（WebSocket 先は `ws://localhost:33330/`）。

リポジトリのルートで:

```sh
pnpm install
pnpm nx bundle browser-polyfill
cp libs/browser-polyfill/dist/polyfill.js docs/examples/led-blink/
cd docs/examples/led-blink
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開く。`polyfill.js` は生成物のため git 管理外である。コピーを忘れると 404 になる。

`index.html` の読み込み順:

```html
<script src="./polyfill.js"></script>
<script src="./main.js" defer></script>
```

`main.js` は初回の `navigator.requestGPIOAccess()` で Runtime へ接続する。

## 操作手順

1. 配線と Runtime 起動、Browser 起動を完了する
2. `http://localhost:4173/` を Raspberry Pi 上のブラウザで開く
3. ページ表示と同時に GPIO26 の点滅が始まる（Start ボタンは無い）
4. タブを閉じると点滅は止まる。サンプルは旧 LEDblink と同じ無限ループのためクライアントでは `unexport` しない。GPIO の解放はサーバが WebSocket 切断時に行う

代替（web-demo の Start / Stop）:

```sh
pnpm nx serve web-demo
```

`http://localhost:4200/#/gpio-output` を開き、接続状態が **Connected** のとき Start で点滅、Stop で消灯する。画面離脱 / reload / WebSocket 切断でも止まる。詳細は [browser-polyfill.md](./browser-polyfill.md)。

## 期待結果

- ページを開くと LED が **1 秒間隔**で点灯 / 消灯する
- `write(1)` で点灯、`write(0)` で消灯（active HIGH）
- タブを閉じたあと、同じ GPIO26 を再度 `export` できる（HTML サンプルを開き直す、または web-demo の Start）

## Troubleshooting

汎用の起動・device 障害は [troubleshooting.md](./troubleshooting.md) を参照する。ここでは LED Blink 固有の切り分けだけを書く。

### `polyfill.js` が 404 になる

`pnpm nx bundle browser-polyfill` のあと、`libs/browser-polyfill/dist/polyfill.js` を `docs/examples/led-blink/` へコピーしたかを確認する。`python3 -m http.server` のカレントディレクトリが `docs/examples/led-blink` であること。

### ページは開くが LED が点かない / エラーが出る

| 確認 | 対処 |
| --- | --- |
| Runtime が止まっている | `./scripts/start.sh` と `curl http://localhost:33330/health` |
| LED の極性 | アノード（長い足）が抵抗側、カソードが GND |
| ピン取り違え | 物理 pin 37（BCM 26）と pin 39（GND）。5V ピン（2 / 4）は使わない |
| 非 Pi 環境 | macOS などでは実 GPIO が無い。Raspberry Pi 上で開く |
| 別マシンのブラウザ | 既定の接続先は `ws://localhost:33330/`。Pi 上で開くか、script の前に `CHIRIMEN_WS_URL` を設定する（[browser-polyfill.md](./browser-polyfill.md)） |

### `export` が Permission denied / EROFS になる

GPIO device の mount と sysfs の書き込み経路の問題。[troubleshooting.md](./troubleshooting.md) の「Permission denied」と「GPIO export で EROFS」を参照する。

### タブを閉じたあと、同じ GPIO26 を再度使えない

HTML サンプルは旧 LEDblink と同じ無限ループのため、クライアント側では `unexport` しない。タブを閉じると WebSocket が切れ、サーバが GPIO を解放する。それでも使えない場合は container を再作成してからページを開き直す。

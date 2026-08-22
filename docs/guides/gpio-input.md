# GPIO Input

初めての利用者が、旧 CHIRIMEN button と同じ HTML サンプルでタクトスイッチの入力変化（onchange）を再現する手順。

関連:

- 親 Issue: [#51 GPIO Input example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/51)
- 子 Issue: [#113 GPIO Input guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/113)
- 回路仕様（正本）: [gpio-input.md](../examples/gpio-input.md)
- HTML サンプル: [docs/examples/button/](../examples/button/)
- LED 回路（HTML サンプルで使用）: [gpio-led-blink.md](../examples/gpio-led-blink.md)
- [Getting Started](./getting-started.md)
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-oh/chirimen gc/gpio/button](https://github.com/chirimen-oh/chirimen/tree/master/gc/gpio/button)

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の GPIO5 の押下を Browser で確認できる。HTML サンプルは押下で GPIO26 の LED を点灯する。

## 必要部品

スイッチ（入力）:

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| タクトスイッチ | 1 | SPST、モーメンタリ（押している間だけ ON）。2 pin を想定 |
| プルアップ抵抗 | 1 | **10kΩ** |
| ジャンパワイヤ | 3 本以上 | GPIO5、GND、3.3V へ |

4 pin タクトスイッチを使う場合、端子が出ている向き（縦）は常時導通で、それと直交する方向がボタンで切り替わる。ジャンパは直交方向の端子へつなぐ。詳細は [回路仕様](../examples/gpio-input.md) を参照する。

HTML サンプルは旧 button と同じく GPIO26 の LED も使う。LED 側の部品は [GPIO LED Blink](./gpio-led-blink.md) を参照する。web-demo の GPIO Input だけを使う場合、LED は不要。

## 配線

外部プルアップ / active LOW。離すと `1`、押すと `0`。

| 役割 | BCM（`ports.get`） | 40-pin header 物理 pin |
| --- | --- | --- |
| GPIO input | `5` | `29` |
| GND | — | `30` |
| 3.3V（プルアップ） | — | `17` |

```text
3.3V (物理 pin 17)
  → 10kΩ
  → GPIO5 (物理 pin 29) ─┬─ タクトスイッチ ─→ GND (物理 pin 30)
```

手順:

1. 10kΩ の一端を **物理 pin 17**（3.3V）へ接続する
2. 10kΩ の他端を **物理 pin 29**（BCM 5）へ接続する
3. タクトスイッチの一端を **物理 pin 29**（BCM 5）へ接続する
4. タクトスイッチの他端を **物理 pin 30**（GND）へ接続する

禁止:

- **5V ピン**（物理 pin 2 / 4）へ接続しない
- プル無しの浮遊入力にしない（onchange が不安定になる）
- GPIO 同士を短絡しない

HTML サンプルで LED を点灯させる場合は、続けて [GPIO LED Blink](./gpio-led-blink.md) の配線（BCM 26 / 物理 pin 37）を行う。GPIO5 と GPIO26 は共存できる。

Pi 3 / 4 / 5 で配線を変える必要はない。ピン対応の根拠と電流計算は [回路仕様](../examples/gpio-input.md) を参照する。

## Runtime 起動

Raspberry Pi 上で CHIRIMEN Runtime を起動する。clone と host 準備は [raspberry-pi-setup.md](./raspberry-pi-setup.md) を先に完了する。

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

詳細は [Getting Started](./getting-started.md) を参照する。

## Browser 起動

サンプルは旧 button と同じく、同じディレクトリの `polyfill.js` と `main.js` を HTML から読む。`file://` ではなく HTTP で開く（WebSocket 先は `ws://localhost:33330/`）。

```sh
cd docs/examples/button
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開く。`polyfill.js` はサンプルに同梱する。polyfill を更新したらリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する（`docs/examples/button/polyfill.js` へコピーされる）。

Browser Editor から編集する場合は `./scripts/start.sh` のあと `http://127.0.0.1:4173/button/` を開き、保存後に Example タブを reload する。Web Demo は起動済みなので `http://127.0.0.1:4200/#/gpio-input` でも確認できる（Run Task **Open Web Demo** / **Serve examples** は URL 案内）。手順は [Getting Started](./getting-started.md) と [docs/examples/README.md](../examples/README.md)。

`index.html` の読み込み順:

```html
<script src="./polyfill.js"></script>
<script src="./main.js" defer></script>
```

`main.js` は初回の `navigator.requestGPIOAccess()` で Runtime へ接続する。`onchange` は本 Runtime では `{ value, portNumber }` を受け取る（旧 CHIRIMEN は値そのもの）。

## 操作手順

1. 配線と Runtime 起動、Browser 起動を完了する
2. `http://localhost:4173/` を Raspberry Pi 上のブラウザで開く
3. ページ表示と同時に GPIO5 の `onchange` が有効になる（Start ボタンは無い）
4. タクトスイッチを押すと GPIO26 の LED が点灯し、離すと消灯する
5. タブを閉じると購読は止まる。サンプルは旧 button と同じくクライアントでは `unexport` しない。GPIO の解放はサーバが WebSocket 切断時に行う

代替（web-demo の Start / Stop / Read）:

```sh
./scripts/start.sh
```

`http://127.0.0.1:4200/#/gpio-input` を開き、接続状態が **Connected** のとき Start で GPIO5 を input で開き、`onchange` で現在値 `0` / `1` を realtime 表示する。Read で再読込、Stop / 画面離脱 / reload / WebSocket 切断でも止まる。LED は使わない。host 開発は Compose web-demo を止めて `pnpm nx serve web-demo`。詳細は [browser-polyfill.md](./browser-polyfill.md)。

## 期待結果

- 離すと GPIO5 は **`1`**、押すと **`0`**（active LOW）
- HTML サンプルでは押下で LED が点灯し、離すと消灯する
- タブを閉じたあと、同じ GPIO5（と GPIO26）を再度 `export` できる（HTML サンプルを開き直す、または web-demo の Start）

## Troubleshooting

汎用の起動・device 障害は [troubleshooting.md](./troubleshooting.md) を参照する。ここでは GPIO Input 固有の切り分けだけを書く。

### `polyfill.js` が 404 になる

`docs/examples/button/polyfill.js` がディレクトリにあり、`python3 -m http.server` のカレントディレクトリが `docs/examples/button` であることを確認する。欠けている場合はリポジトリのルートで `pnpm nx bundle browser-polyfill` を実行する。

### ページは開くが値が変わらない / LED が点かない

| 確認 | 対処 |
| --- | --- |
| Runtime が止まっている | `./scripts/start.sh` と `curl http://localhost:33330/health` |
| ピン取り違え | 物理 pin 29（BCM 5）、pin 30（GND）、pin 17（3.3V）。5V ピン（2 / 4）は使わない |
| 4 pin タクトの端子向き | 常時導通側ではなく、ボタンで切り替わる直交方向へつなぐ |
| プルアップが無い | 外部 10kΩ を 3.3V と GPIO5 の間に入れる。内部プルアップには依存しない |
| 離しても `0` のまま | スイッチが常時導通（4 pin の取り違え）か、GPIO が GND に短絡していないか確認する |
| LED が点かない | [gpio-led-blink.md](./gpio-led-blink.md) の極性・抵抗・物理 pin 37 / 39 を確認する |
| 非 Pi 環境 | macOS などでは実 GPIO が無い。Raspberry Pi 上で開く |
| 別マシンのブラウザ | Editor / Example / Web Demo は既定で `127.0.0.1` のみ。LAN は `./scripts/start.sh --lan`。HTML は `CHIRIMEN_WS_URL`、Web Demo はページの hostname へ WS 接続する（[browser-polyfill.md](./browser-polyfill.md)） |

### `export` が Permission denied / EROFS になる

GPIO device の mount と sysfs の書き込み経路の問題。[troubleshooting.md](./troubleshooting.md) の「Permission denied」と「GPIO export で EROFS」を参照する。

### タブを閉じたあと、同じ GPIO5 を再度使えない

HTML サンプルは旧 button と同じく、クライアント側では `unexport` しない。タブを閉じると WebSocket が切れ、サーバが GPIO を解放する。それでも使えない場合は container を再作成してからページを開き直す。

# GPIO Input

初めての利用者が、web-demo の GPIO Input でタクトスイッチの入力変化（onchange）を再現する手順。

関連:

- 親 Issue: [#51 GPIO Input example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/51)
- 子 Issue: [#113 GPIO Input guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/113)
- 回路仕様（正本）: [gpio-input.md](../examples/gpio-input.md)
- [Getting Started](./getting-started.md)
- [Browser Polyfill](./browser-polyfill.md)
- [Troubleshooting](./troubleshooting.md)
- 参考: [chirimen-oh/chirimen gc/gpio/button](https://github.com/chirimen-oh/chirimen/tree/master/gc/gpio/button)（ピン参照。LED 側は本ガイドの対象外）

このガイドの手順だけで、Raspberry Pi 3 / 4 / 5 上の GPIO5 の押下を Browser で確認できる。

## 必要部品

| 部品 | 数量 | 仕様 |
| --- | --- | --- |
| タクトスイッチ | 1 | SPST、モーメンタリ（押している間だけ ON）。2 pin を想定 |
| プルアップ抵抗 | 1 | **10kΩ** |
| ジャンパワイヤ | 3 本以上 | GPIO5、GND、3.3V へ |

4 pin タクトスイッチを使う場合、端子が出ている向き（縦）は常時導通で、それと直交する方向がボタンで切り替わる。ジャンパは直交方向の端子へつなぐ。詳細は [回路仕様](../examples/gpio-input.md) を参照する。

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

Pi 3 / 4 / 5 で配線を変える必要はない。ピン対応の根拠と電流計算は [回路仕様](../examples/gpio-input.md) を参照する。

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

web-demo の GPIO Input（`#/gpio-input`）が再現先である。Runtime と同じ Raspberry Pi 上で起動する。

```sh
pnpm nx serve web-demo
```

ブラウザで `http://localhost:4200/#/gpio-input` を開く。画面上の接続状態が **Connected** であることを確認する。Runtime が止まっていると `Error` になる。詳細は [browser-polyfill.md](./browser-polyfill.md)。

## 操作手順

1. 配線と Runtime 起動、Browser 起動を完了する
2. `http://localhost:4200/#/gpio-input` を Raspberry Pi 上のブラウザで開く
3. 接続状態が **Connected** のとき **Start** を押す。GPIO5 を `export('in')` し、初回 `read()` の値が表示される（離した状態なら `1`）
4. タクトスイッチを押すと値が `0` になり、離すと `1` に戻る。変化は `onchange` で realtime 表示される
5. **Read** で現在値を再読込できる（実行中のみ）
6. **Stop** で `onchange` を解除し `unexport` する。画面離脱 / reload / WebSocket 切断 / Runtime 停止でも止まる。再接続後は自動再開しない

Cleanup のタイミングは [回路仕様の Cleanup](../examples/gpio-input.md#cleanup) を参照する。

## 期待結果

- 離すと **`1`**、押すと **`0`**（active LOW）
- Start 後、押下のたびに値が realtime で更新される
- Stop したあと、同じ GPIO5 を再度 Start できる

## Troubleshooting

汎用の起動・device 障害は [troubleshooting.md](./troubleshooting.md) を参照する。ここでは GPIO Input 固有の切り分けだけを書く。

### 接続状態が Connected にならない / Start できない

| 確認 | 対処 |
| --- | --- |
| Runtime が止まっている | `./scripts/start.sh` と `curl http://localhost:33330/health` |
| 別マシンのブラウザ | 既定の接続先は `ws://localhost:33330/`。Pi 上で開くか、接続 URL を指定する（[browser-polyfill.md](./browser-polyfill.md)） |
| 非 Pi 環境 | macOS などでは実 GPIO が無い。Raspberry Pi 上で開く |

### Start できるが値が変わらない / 不安定

| 確認 | 対処 |
| --- | --- |
| ピン取り違え | 物理 pin 29（BCM 5）、pin 30（GND）、pin 17（3.3V）。5V ピン（2 / 4）は使わない |
| 4 pin タクトの端子向き | 常時導通側ではなく、ボタンで切り替わる直交方向へつなぐ |
| プルアップが無い | 外部 10kΩ を 3.3V と GPIO5 の間に入れる。内部プルアップには依存しない |
| 離しても `0` のまま | スイッチが常時導通（4 pin の取り違え）か、GPIO が GND に短絡していないか確認する |

### `export` が Permission denied / EROFS になる

GPIO device の mount と sysfs の書き込み経路の問題。[troubleshooting.md](./troubleshooting.md) の「Permission denied」と「GPIO export で EROFS」を参照する。

### Stop したあと、同じ GPIO5 を再度使えない

Stop / 画面離脱 / reload / 切断で `onchange` 解除と `unexport` が走る。再接続後は自動再開しないので、Connected になってから Start し直す。それでも使えない場合は container を再作成してから Start する。

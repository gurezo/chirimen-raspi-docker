# Browser Polyfill（script 読み込み）

旧 CHIRIMEN の [`polyfill.js`](https://github.com/chirimen-oh/chirimen/blob/master/gc/polyfill/polyfill.js) と同様に、単一 JS ファイルを `<script>` で読み込んで `navigator.requestGPIOAccess()` / `navigator.requestI2CAccess()` を使う手順。

関連:

- 親 Issue: [#49 apps/web-demo を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/49)
- 子 Issue: [#127 browser-polyfill を単一ファイル（IIFE/UMD）にバンドルする](https://github.com/gurezo/chirimen-raspi-docker/issues/127)
- 子 Issue: [#102 web-demo に Browser Polyfill を組み込む](https://github.com/gurezo/chirimen-raspi-docker/issues/102)
- 子 Issue: [#103 Runtime 接続状態 UI を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/103)
- 子 Issue: [#104 GPIO / I2C demo navigation を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/104)
- [Getting Started](./getting-started.md)（Runtime の起動）
- [Protocol](../architecture/protocol.md)

## 成果物を生成する

```sh
pnpm nx bundle browser-polyfill
```

出力:

```text
libs/browser-polyfill/dist/polyfill.js
```

`pnpm build`（CI 含む）でも同じ bundle が走る。成果物は git 管理外（`dist`）。

## 旧 polyfill.js からの移行

旧 CHIRIMEN では次のように読み込んでいた。

```html
<script src="polyfill.js"></script>
<script>
  const gpioAccess = await navigator.requestGPIOAccess();
  const i2cAccess = await navigator.requestI2CAccess();
</script>
```

本リポジトリの IIFE でも同じ形で使える。先に [Runtime を起動](./getting-started.md) し、生成した `polyfill.js` を HTML から読む。

```html
<script src="./polyfill.js"></script>
<script>
  const gpioAccess = await navigator.requestGPIOAccess();
  const i2cAccess = await navigator.requestI2CAccess();
</script>
```

読み込み直後に `navigator.requestGPIOAccess` / `requestI2CAccess` が付く。未初期化のまま呼ぶと、default URL で Runtime へ接続する（旧 polyfill の初回接続相当）。

### 接続 URL の差分

| 項目 | 旧 `polyfill.js` | 本 IIFE |
| --- | --- | --- |
| default URL | `wss://localhost:33330/` | `ws://localhost:33330/` |
| 通信 | 独自 binary / function id | JSON protocol（`libs/protocol`） |

ローカルの Docker Runtime は HTTPS ではないため `ws://` を使う。

## WebSocket URL の指定

優先順位は次のとおり。

1. `installBrowserPolyfill({ url })` を明示呼び出し（推奨。任意の URL）
2. script 読み込み**前**に `globalThis.CHIRIMEN_WS_URL` を設定
3. 省略時は `ws://localhost:33330/`

### 明示初期化（installBrowserPolyfill）

```html
<script src="./polyfill.js"></script>
<script>
  await installBrowserPolyfill({ url: 'ws://192.168.1.10:33330/' });
  const access = await navigator.requestGPIOAccess();
</script>
```

`installBrowserPolyfill` は IIFE 読み込み後に `globalThis.installBrowserPolyfill` としても使える。再呼び出しは既存 API を上書きする。

### CHIRIMEN_WS_URL

```html
<script>
  globalThis.CHIRIMEN_WS_URL = 'ws://192.168.1.10:33330/';
</script>
<script src="./polyfill.js"></script>
<script>
  const access = await navigator.requestGPIOAccess();
</script>
```

## ESM import との使い分け

TypeScript / Vite アプリでは、IIFE ではなく ESM から import する。`apps/web-demo` はこの方法で Browser Polyfill を組み込んでいる。

```ts
import { installBrowserPolyfill } from 'browser-polyfill';

await installBrowserPolyfill({
  url: 'ws://localhost:33330/',
  onStatus: (status) => {
    console.log(status);
  },
});
const access = await navigator.requestGPIOAccess();
```

`onStatus` / `addStatusListener` で次の 4 状態を購読できる。`getStatus()` でも現在値を取れる。

```text
disconnected
connecting
connected
error
```

`error` のときは第 2 引数に `ChirimenError` が付く。ESM では `installBrowserPolyfill` の**前**に `requestGPIOAccess` / `requestI2CAccess` を呼ぶと `ChirimenError(InvalidAccess)` になる。lazy 接続は IIFE / script tag 専用。

### web-demo で確認する

```sh
pnpm nx serve web-demo
```

ブラウザで `http://localhost:4200/` を開く。画面上の接続状態が次のいずれかになる。

```text
Disconnected
Connecting
Connected
Error
```

Runtime が止まっていると `Error` と起動確認の案内が出る。[Runtime を起動](./getting-started.md)すると `Connected` に変わる。画面上のナビから次の demo へ移動できる。

```text
GPIO Output   → #/gpio-output（Start / Stop で LED Blink）
GPIO Input    → #/gpio-input（#51）
I2C Scan      → #/i2c-scan（#52）
```

GPIO Output の配線は [gpio-led-blink.md](../examples/gpio-led-blink.md)（BCM 26 / 物理 pin 37 / LED + 330Ω）。Runtime が `Connected` のとき Start で点滅を開始し、Stop / 画面離脱 / reload / WebSocket 切断で止めて GPIO を unexport する。終了後は同じ GPIO26 を再度 Start できる。操作手順の本ガイドは [#108](https://github.com/gurezo/chirimen-raspi-docker/issues/108)。

接続成功後、コンソールで次が関数であることを確認できる。

```text
navigator.requestGPIOAccess
navigator.requestI2CAccess
```

公開 TypeScript API は [API リファレンス](https://gurezo.github.io/chirimen-raspi-docker/api/) を参照。

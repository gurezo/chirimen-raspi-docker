# Protocol message model

Browser Polyfill と Node Runtime（`apps/server`）の間の通信契約を `libs/protocol` に集約する。

本ドキュメントは Issue #31 時点の **型としてのメッセージ封筒** と、既存 CHIRIMEN（`polyfill.js` / `srv.js`）の function id 方式からの継承・変更方針、Issue #32 / #33 の **GPIO / I2C protocol ↔ Node Runtime 対応**、および Issue #34 の **wire format（encode / decode）** を記録する。

関連:

- 親 Issue: [#3 Phase 3-4: Protocol and Browser Polyfill](https://github.com/gurezo/chirimen-raspi-docker/issues/3)
- 子 Issue: [#31 Protocol message model を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/31)
- 子 Issue: [#32 GPIO protocol operations を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/32)
- 子 Issue: [#33 I2C protocol operations を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/33)
- 子 Issue: [#34 Protocol encode / decode を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/34)
- 子 Issue: [#36 WebSocket client transport を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/36)
- 親 Issue: [#5 Phase 5: WebSocket and GPIO onchange](https://github.com/gurezo/chirimen-raspi-docker/issues/5)
- 子 Issue: [#39 WebSocket server lifecycle を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/39)
- 親 Issue: [#52 I2C Scan example を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/52)
- 子 Issue: [#114 Browser から I2C Scan を呼び出す API flow を確定する](https://github.com/gurezo/chirimen-raspi-docker/issues/114)
- 子 Issue: [#115 I2C Scan UI を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/115)
- 子 Issue: [#116 I2C Scan の実機検証を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- 子 Issue: [#117 I2C Scan guide を作成する](https://github.com/gurezo/chirimen-raspi-docker/issues/117)
- Wiki: [00.Current-situation-analysis](https://github.com/gurezo/chirimen-raspi-docker/wiki/00.Current-situation-analysis)
- 上流: [polyfill.js](https://github.com/chirimen-oh/chirimen/blob/master/gc/polyfill/polyfill.js)、[srv.js](https://github.com/chirimen-oh/chirimen/blob/master/_gc/srv/srv.js)

## メッセージ封筒

| 種別 | `kind` | 役割 |
| --- | --- | --- |
| Request | `request` | Browser → Server の操作要求 |
| Success response | `response` + `ok: true` | 成功結果 |
| Error response | `response` + `ok: false` | 失敗（`ChirimenErrorPayload`） |
| Event | `event` | Server → Browser の非同期通知（例: GPIO onchange） |

### ID の分離

旧 polyfill ではバイト列の「session」（16-bit カウンタ）が **リクエスト相関 ID** として使われていた。新 protocol では役割を明示的に分ける。

| フィールド | 意味 | 旧実装との対応 |
| --- | --- | --- |
| `requestId` | request / response の相関 | polyfill の session カウンタ相当 |
| `sessionId` | 接続単位の識別（任意） | srv.js の `conn.uid` 相当 |

### operation / payload

- TypeScript 上の `operation` は文字列の判別共用体（例: `gpio.export`, `i2c.read8`）
- `payload` は operation ごとに型付けする（`gpio` / `i2c` lib には依存しない plain 値）
- GPIO の runtime 対応詳細は #32、I2C は #33 で確定。wire 上の serialize / deserialize は #34（本節「Wire format」）

## Wire format（encode / decode）

Browser と Node は同一の JSON テキストをやり取りする。旧 polyfill のバイナリ frame（function id 先頭）は **主 wire format としては採用しない**。

| 項目 | 決定 |
| --- | --- |
| 搬送単位 | WebSocket text frame 想定の `string`（UTF-8） |
| 表現 | `ProtocolMessage` の JSON（`kind` / `operation` / `payload` 等） |
| `operation` | 文字列（例: `gpio.export`）。数値 Legacy function id は wire に載せない |
| `direction` | wire 上も `'in' \| 'out'`（旧バイナリの 0/1 変換は行わない） |
| `requestId` | 整数 `0`–`0xffff`（旧 polyfill session カウンタ相当） |
| Legacy id | 参照マッピングのみ（#32 / #33）。encode / decode 本体では使わない |

### API

| 関数 | 入出力 |
| --- | --- |
| `encodeProtocolMessage(message)` | `ProtocolMessage` → JSON `string` |
| `decodeProtocolMessage(data)` | JSON `string` → `ProtocolMessage` |

実装: `libs/protocol/src/lib/codec.ts`

### 検証とエラー

encode / decode の双方で封筒形状・既知 `operation`・operation ごとの payload・`requestId` 範囲を検証する。  
invalid（JSON 破損・未知 operation・payload 不正・`requestId` 範囲外など）は `ChirimenError`（`code: 'InvalidArgument'`）を throw する。

## GPIO protocol ↔ Node Runtime 対応

Browser 起点の GPIO `operation` は Node Runtime の `GpioSession` / `GpioPort` と 1:1 に対応する。  
operation 名は legacy / WebGPIO domain（`export` / `unexport`）に揃え、Issue 文面の open / release は runtime 公開 API 名としてここに明示する。

| Protocol `operation` | Legacy id | Node Runtime | Domain (`GpioPort`) |
| --- | --- | --- | --- |
| `gpio.export` | `0x10` | `GpioSession.open(port, direction)` | `export(direction)` |
| `gpio.write` | `0x11` | open 済み `GpioPort.write(value)` | `write` |
| `gpio.read` | `0x12` | open 済み `GpioPort.read()` | `read` |
| `gpio.unexport` | `0x13` | `GpioSession.release(port)` | `unexport` |
| `gpio.subscribe` | （`0x14` 周辺の制御） | `GpioSession.subscribe(port, listener)` | `onchange` |
| `gpio.unsubscribe` | （`0x14` 周辺の制御） | `GpioSession.unsubscribe(port, listener?)` | `onchange = null` |
| event `gpio.onchange` | `0x14` | subscribe listener → WebSocket event | `onchange` handler |

### 責務分界

- `libs/protocol` は対応定数・型・type guard のみを提供し、`gpio` / `node-runtime` には依存しない
- `GpioSession.releaseAll()` は切断時 cleanup 用であり、Browser 起点の protocol operation には含めない
- `gpio.subscribe` / `gpio.unsubscribe` / event `gpio.onchange` は Issue [#40](https://github.com/gurezo/chirimen-raspi-docker/issues/40) で server / Node Runtime に実装済み。Browser 側 `onchange` 配線は [#41](https://github.com/gurezo/chirimen-raspi-docker/issues/41) で完了
- コード上の対応表: `libs/protocol/src/lib/gpio-operation-mapping.ts`

### Request / response payload（GPIO）

| operation | request payload | success payload |
| --- | --- | --- |
| `gpio.export` | `{ portNumber, direction: 'in' \| 'out' }` | `{}` |
| `gpio.read` | `{ portNumber }` | `{ value: 0 \| 1 }` |
| `gpio.write` | `{ portNumber, value: 0 \| 1 }` | `{}` |
| `gpio.unexport` | `{ portNumber }` | `{}` |
| `gpio.subscribe` | `{ portNumber }` | `{}` |
| `gpio.unsubscribe` | `{ portNumber }` | `{}` |
| event `gpio.onchange` | — | `{ portNumber, value: 0 \| 1 }`（event payload） |

## I2C protocol ↔ Node Runtime 対応

Browser 起点の I2C `operation` は Node Runtime の `I2cSession` / `I2CSlaveDevice` と 1:1 に対応する。  
旧 polyfill では少数の function id（`0x20`–`0x23`）に複数 API がパックされていたが、新 protocol では domain API（`I2CSlaveDevice`）に近い operation 名にする。

| Protocol `operation` | Legacy id | Node Runtime | Domain |
| --- | --- | --- | --- |
| `i2c.open` | `0x20` | `I2cSession.open(portNumber, slaveAddress)` | `I2CPort.open(slaveAddress)` |
| `i2c.close` | `0x20` | `I2cSession.close(portNumber, slaveAddress)` | （session 追跡解除） |
| `i2c.write8` | `0x21` | open 済み `I2CSlaveDevice.write8(...)` | `write8` |
| `i2c.write16` | `0x21` | open 済み `I2CSlaveDevice.write16(...)` | `write16` |
| `i2c.writeByte` | `0x21` | open 済み `I2CSlaveDevice.writeByte(...)` | `writeByte` |
| `i2c.writeBytes` | `0x21` | open 済み `I2CSlaveDevice.writeBytes(...)` | `writeBytes` |
| `i2c.readByte` | `0x22` | open 済み `I2CSlaveDevice.readByte()` | `readByte` |
| `i2c.readBytes` | `0x22` | open 済み `I2CSlaveDevice.readBytes(length)` | `readBytes` |
| `i2c.read8` | `0x23` | open 済み `I2CSlaveDevice.read8(...)` | `read8` |
| `i2c.read16` | `0x23` | open 済み `I2CSlaveDevice.read16(...)` | `read16` |

### 責務分界

- `libs/protocol` は対応定数・型・type guard のみを提供し、`i2c` / `node-runtime` には依存しない
- `I2cSession.closeAll()` は切断時 cleanup 用であり、Browser 起点の protocol operation には含めない
- `I2cSession.scan()` は Scan example 向けの runtime API であり、本 protocol の Browser request には含めない（[#114](https://github.com/gurezo/chirimen-raspi-docker/issues/114) で Demo-only として確定。本節「I2C Scan API flow」）
- Legacy function id は 1:N（例: `0x20` → `i2c.open` / `i2c.close`）。参照用であり JSON wire には載せない（#34）
- コード上の対応表: `libs/protocol/src/lib/i2c-operation-mapping.ts`

### Request / response payload（I2C）

| operation | request payload | success payload |
| --- | --- | --- |
| `i2c.open` | `{ portNumber, slaveAddress }` | `{}` |
| `i2c.close` | `{ portNumber, slaveAddress }` | `{}` |
| `i2c.read8` | `{ portNumber, slaveAddress, registerNumber }` | `{ value }` |
| `i2c.read16` | `{ portNumber, slaveAddress, registerNumber }` | `{ value }` |
| `i2c.write8` | `{ portNumber, slaveAddress, registerNumber, value }` | `{}` |
| `i2c.write16` | `{ portNumber, slaveAddress, registerNumber, value }` | `{}` |
| `i2c.readByte` | `{ portNumber, slaveAddress }` | `{ value }` |
| `i2c.writeByte` | `{ portNumber, slaveAddress, value }` | `{}` |
| `i2c.readBytes` | `{ portNumber, slaveAddress, length }` | `{ bytes }` |
| `i2c.writeBytes` | `{ portNumber, slaveAddress, bytes }` | `{ bytes }` |

値域（protocol 上の plain 値。domain と揃える）:

- `portNumber`: 非負整数
- `slaveAddress`: `0x00`–`0x7f`
- `registerNumber`: `0`–`0xffff`
- byte `value` / `bytes` 要素: `0`–`0xff`
- word `value`（`read16` / `write16`）: `0`–`0xffff`
- `length` / `bytes` 長: `1`–`127`

## Legacy function id 対応表

| function id | 旧 polyfill / srv | 新 `operation`（型） |
| --- | --- | --- |
| `0x10` | GPIO export | `gpio.export` |
| `0x11` | GPIO write | `gpio.write` |
| `0x12` | GPIO read | `gpio.read` |
| `0x13` | GPIO unexport | `gpio.unexport` |
| `0x14` | GPIO onchange（server→client） | event `gpio.onchange`（＋ `gpio.subscribe` / `gpio.unsubscribe`） |
| `0x20` | I2C acquire / free | `i2c.open` / `i2c.close` |
| `0x21` | I2C writeBytes（複数 API をパック） | `i2c.write8` / `write16` / `writeByte` / `writeBytes` |
| `0x22` | I2C readBytes | `i2c.readByte` / `readBytes` |
| `0x23` | I2C register read | `i2c.read8` / `read16` |

## 継承するもの / 変更するもの

| 継承 | 変更 |
| --- | --- |
| GPIO `0x10`–`0x14` / I2C `0x20`–`0x23` の操作集合の概念 | TS 上は文字列 `operation`。GPIO runtime 対応は #32、I2C は #33。wire は JSON テキスト（#34） |
| リクエスト相関 ID | 名称を `requestId`（`0`–`0xffff`）に。`sessionId` と分離 |
| GPIO onchange を非同期 event として送る | `kind: 'event'` を明示 |
| OK / NG 判定 | `ChirimenErrorPayload`（`code` + `message`）による構造化 error response |
| I2C を少数 function にパックする実装 | domain API（`I2CSlaveDevice`）に近い 1:1 operation 名 |
| バイナリ WebSocket frame | JSON テキスト。Legacy function id は参照のみ |

## 依存境界

`libs/protocol`（`layer:protocol`）は `libs/core`（`layer:core`）のみに依存する。`gpio` / `i2c` / `node-runtime` / `browser-polyfill` には依存しない。

詳細は [nx-boundaries.md](./nx-boundaries.md) を参照。

## WebSocket client transport

Browser Polyfill 側の搬送層は `libs/browser-polyfill` の `WebSocketClientTransport` が担う（Issue #36）。

| 項目 | 決定 |
| --- | --- |
| 搬送 | WebSocket text frame + `encodeProtocolMessage` / `decodeProtocolMessage` |
| 相関 | 送信時に `requestId`（`0`–`0xffff`）を発行し、response を対応 Promise へ返す |
| timeout | デフォルト 10000ms。期限切れは `ChirimenError`（`code: 'Operation'`） |
| disconnect | `close` / 明示 `disconnect()` 時、pending request を `ChirimenError`（`code: 'DeviceUnavailable'`）で reject。pending は再送しない |
| reconnect | 一度接続成功後の予期せぬ `close` のみ自動 reconnect。間隔デフォルト 1000ms、最大試行回数デフォルト `Infinity`（`reconnectIntervalMs` / `maxReconnectAttempts` で上書き可）。明示 `disconnect()` では再接続しない |
| reconnect 中の request | 切断時点の pending は即 reject。再接続待ちの新規 `request()` は完了まで待ち、上限到達時は `DeviceUnavailable`（`WebSocket reconnect failed`） |
| event | 相関対象外。constructor の `onEvent` と `addEventListener` / `removeEventListener` へ fan-out。server 側 `gpio.onchange` 配信は [#40](https://github.com/gurezo/chirimen-raspi-docker/issues/40)、Browser `onchange` 配線は [#41](https://github.com/gurezo/chirimen-raspi-docker/issues/41) で完了 |
| 依存 | `protocol` / `core` のみ。`node-runtime` には依存しない |

実装: `libs/browser-polyfill/src/lib/websocket-client-transport.ts`（reconnect は [#42](https://github.com/gurezo/chirimen-raspi-docker/issues/42)）

## WebSocket server lifecycle

Node server 側の接続管理は `apps/server` が担う（Issue #39）。GPIO request routing / onchange 配信は Issue #40。

| 項目 | 決定 |
| --- | --- |
| 搬送 | 既存 Express/HTTP server（port `33330`）へ `ws` の `WebSocketServer` を attach |
| session | 接続ごとに `sessionId`（UUID）と `GpioSession` / `I2cSession` を作成 |
| disconnect | `close` / `error` で `GpioSession.releaseAll()` と `I2cSession.closeAll()` を実行 |
| shutdown | 全 session を cleanup → WebSocket server close → process 全体の GPIO `unexportAll` |
| メッセージ処理 | GPIO request（`export` / `read` / `write` / `unexport` / `subscribe` / `unsubscribe`）を routing。subscribe 中のみ `gpio.onchange` event を送る。I2C は Scan 用の `i2c.open` / `i2c.writeByte` のみ routing（他の `i2c.*` は未実装） |

実装:

- `apps/server/src/app/client-session.ts`
- `apps/server/src/app/client-session-registry.ts`
- `apps/server/src/app/websocket-server.ts`
- `apps/server/src/app/protocol-router.ts`

## Browser GPIO polyfill 入口

`navigator.requestGPIOAccess()` は Issue #37 で `libs/browser-polyfill` に実装する。

| 項目 | 決定 |
| --- | --- |
| 初期化 | `installBrowserPolyfill(options)` で `WebSocketClientTransport` を接続し、`navigator.requestGPIOAccess` を登録する |
| 取得 | `await navigator.requestGPIOAccess()` → domain `GpioAccess`（`BrowserGpioAccess`） |
| ports | CHIRIMEN `polyfill.js` と同じ BCM ピン固定一覧（含む `26`） |
| 操作 | `GpioPort.export` / `read` / `write` / `unexport` → `gpio.export` / `read` / `write` / `unexport` |
| onchange | `GpioPort.onchange` 設定で `gpio.subscribe`、`null` 解除で `gpio.unsubscribe`。event `gpio.onchange` を portNumber で demux して handler を呼ぶ（[#41](https://github.com/gurezo/chirimen-raspi-docker/issues/41)） |
| reconnect 方針 | server は切断時 `releaseAll` するため、reconnect 成功後に `#exported` な port は `gpio.export` を再送する。さらに `onchange !== null` の port はローカル handler を残したまま `gpio.subscribe` を再送する（[#42](https://github.com/gurezo/chirimen-raspi-docker/issues/42)） |
| 依存 | `protocol` / `gpio` / `core`。`node-runtime` には依存しない |
| 非対象 | I2C 状態の reconnect 復元。server 側 `gpio.subscribe` / event 配信は [#40](https://github.com/gurezo/chirimen-raspi-docker/issues/40) で完了 |

利用例:

```ts
await installBrowserPolyfill({ url: 'ws://localhost:33330/' });
const access = await navigator.requestGPIOAccess();
const port = access.ports.get(26);
if (!port) {
  throw new Error('GPIO26 is not available');
}
await port.export('in');
port.onchange = (event) => {
  console.log(event.portNumber, event.value);
};
```

## Browser I2C polyfill 入口

`navigator.requestI2CAccess()` は Issue #38 で `libs/browser-polyfill` に実装する。

| 項目 | 決定 |
| --- | --- |
| 初期化 | `installBrowserPolyfill(options)` で共有 `WebSocketClientTransport` を接続し、`navigator.requestI2CAccess` も登録する |
| 取得 | `await navigator.requestI2CAccess()` → domain `I2CAccess`（`BrowserI2CAccess`） |
| ports | CHIRIMEN / Raspberry Pi 慣例の固定バス一覧（`1`） |
| 操作 | `I2CPort.open` → `i2c.open`。slave の read/write → 対応する `i2c.*` |
| 依存 | `protocol` / `i2c` / `core`。`node-runtime` には依存しない |
| 非対象 | domain に無い `i2c.close` 呼び出し（今回は open / read / write のみ） |

利用例:

```ts
await installBrowserPolyfill({ url: 'ws://localhost:33330/' });
const access = await navigator.requestI2CAccess();
const port = access.ports.get(1);
const device = await port?.open(0x48);
```

## I2C Scan API flow（#114）

Browser から I2C Scan を呼び出す経路を [#114](https://github.com/gurezo/chirimen-raspi-docker/issues/114) で確定する。親は [#52](https://github.com/gurezo/chirimen-raspi-docker/issues/52)。UI は [#115](https://github.com/gurezo/chirimen-raspi-docker/issues/115) で実装済み。実機検証は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) で完了（検証仕様は [i2c-scan.md](../examples/i2c-scan.md)、ADT7410 / `0x48`）。操作ガイドは [#117](https://github.com/gurezo/chirimen-raspi-docker/issues/117) で完了（[i2c-scan.md](../guides/i2c-scan.md)）。

Scan は Web I2C 仕様外（chirimen-server 参照実装互換）。`readByte` / `writeByte` が Public なのは `I2CSlaveDevice` の CHIRIMEN polyfill 互換のためであり、scan を Public にする先例にはしない。

### 配置

| 面 | 決定 |
| --- | --- |
| Public API（`libs/i2c` / `libs/protocol` / `libs/browser-polyfill`） | **置かない**。`i2c.scan` operation も `I2CPort.scan()` も追加しない |
| Demo-only（`apps/web-demo`） | Browser example は `navigator.requestI2CAccess()` のみを使い、`open` + `writeByte(0x00)` で走査を合成する（[#118](https://github.com/gurezo/chirimen-raspi-docker/issues/118)） |
| Node Runtime（`libs/node-runtime`） | `I2cSession.scan` / `scanI2cPort` は host / server 用の既存 Public API。Browser / web-demo からは呼ばない |

### 呼び出し経路

```text
web-demo helper（Demo-only）
  → navigator.requestI2CAccess()
  → libs/browser-polyfill
  → Protocol: i2c.open / i2c.writeByte（既存 operation。i2c.scan は無い）
  → apps/server
  → I2cSession.open + I2CSlaveDevice.writeByte
  → I2C bus
```

Browser 側（#115 が実装した Demo helper）の合成:

```ts
const access = await navigator.requestI2CAccess();
const port = access.ports.get(1);
if (!port) {
  throw new Error('I2C port 1 is not available');
}

const found: number[] = [];
for (let addr = 0x03; addr <= 0x77; addr++) {
  try {
    const device = await port.open(addr);
    await device.writeByte(0x00);
    found.push(addr);
  } catch {
    // 応答なし → 無視
  }
}
```

走査範囲と probe（`open` + `writeByte(0x00)`、address 単位の失敗は無視）は Node Runtime の `scanI2cPort` と同じ。payload は既存の `i2c.open` `{ portNumber, slaveAddress }` と `i2c.writeByte` `{ portNumber, slaveAddress, value }` を使う。

### Runtime scan との差分

| 項目 | Node Runtime `I2cSession.scan` / `scanI2cPort` | Browser 合成 scan（Demo-only） |
| --- | --- | --- |
| 入口 | `session.scan(1)` / `scanI2cPort(port)` | `navigator.requestI2CAccess()` → `port.open` + `writeByte` |
| protocol | 使わない（server 内） | `i2c.open` / `i2c.writeByte` を最大 117 往復 |
| session 追跡 | probe の open は opened map に載せない | 成功した `open` は server `I2cSession` に残る。polyfill は `i2c.close` を公開しないため、切断時 `closeAll()` で掃除。web-demo は画面離脱 / reload / 切断で走査を中断する。再 Scan のため server の `i2c.open` は既 open なら success |

demo 用途では往復数は許容する。

### server の I2C routing（Scan 最小）

本節の Browser 経路は既存の `i2c.open` / `i2c.writeByte` に依存する。`apps/server` は [#115](https://github.com/gurezo/chirimen-raspi-docker/issues/115) でこの 2 operation だけ routing する。既に open 済みの `(port, address)` への `i2c.open` は success（再 Scan 用）。他の `i2c.*` は `Unsupported protocol operation` のまま。

## 後続 Issue

| Issue | 内容 |
| --- | --- |
| #32 | GPIO protocol operations の runtime 対応詳細（本節で完了） |
| #33 | I2C protocol operations の runtime 対応詳細（本節で完了） |
| #34 | encode / decode（本節「Wire format」で完了） |
| #35 | `libs/browser-polyfill` 作成（完了） |
| #36 | WebSocket client transport（本節で完了） |
| #37 | `navigator.requestGPIOAccess()`（本節「Browser GPIO polyfill 入口」で完了） |
| #38 | `navigator.requestI2CAccess()`（本節「Browser I2C polyfill 入口」で完了） |
| #39 | WebSocket server lifecycle（本節「WebSocket server lifecycle」で完了） |
| #40 | GPIO event subscribe / unsubscribe（本節・server routing で完了） |
| #41 | Browser GPIO onchange（本節「Browser GPIO polyfill 入口」で完了） |
| #42 | WebSocket reconnect（reconnect 後の GPIO export / subscription 復元を含む。本節で完了） |
| #114 | Browser から I2C Scan を呼び出す API flow（本節「I2C Scan API flow」で完了） |
| #115 | I2C Scan UI（web-demo Demo helper と `i2c.open` / `i2c.writeByte` routing。完了） |
| #116 | I2C Scan の実機検証（ADT7410 / `0x48`。[i2c-scan.md](../examples/i2c-scan.md)。完了） |
| #117 | I2C Scan guide（[i2c-scan.md](../guides/i2c-scan.md)。完了） |

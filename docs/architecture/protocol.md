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
| `gpio.subscribe` | （`0x14` 周辺の制御） | Phase 5 [#40](https://github.com/gurezo/chirimen-raspi-docker/issues/40) で実装予定 | （現状なし） |
| `gpio.unsubscribe` | （`0x14` 周辺の制御） | Phase 5 [#40](https://github.com/gurezo/chirimen-raspi-docker/issues/40) で実装予定 | （現状なし） |
| event `gpio.onchange` | `0x14` | Phase 5 で server→browser 通知 | （現状なし） |

### 責務分界

- `libs/protocol` は対応定数・型・type guard のみを提供し、`gpio` / `node-runtime` には依存しない
- `GpioSession.releaseAll()` は切断時 cleanup 用であり、Browser 起点の protocol operation には含めない
- `gpio.subscribe` / `gpio.unsubscribe` / event `gpio.onchange` は protocol 上の型として定義済み。実装は Phase 5
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
- `I2cSession.scan()` は Scan example 向けの runtime API であり、本 protocol の Browser request には含めない
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
| disconnect | `close` / 明示 `disconnect()` 時、pending request を `ChirimenError`（`code: 'DeviceUnavailable'`）で reject |
| event | 相関対象外。任意の `onEvent` コールバックへ転送（GPIO onchange 本実装は Phase 5） |
| 依存 | `protocol` / `core` のみ。`node-runtime` には依存しない |

実装: `libs/browser-polyfill/src/lib/websocket-client-transport.ts`

## Browser GPIO polyfill 入口

`navigator.requestGPIOAccess()` は Issue #37 で `libs/browser-polyfill` に実装する。

| 項目 | 決定 |
| --- | --- |
| 初期化 | `installBrowserPolyfill(options)` で `WebSocketClientTransport` を接続し、`navigator.requestGPIOAccess` を登録する |
| 取得 | `await navigator.requestGPIOAccess()` → domain `GpioAccess`（`BrowserGpioAccess`） |
| ports | CHIRIMEN `polyfill.js` と同じ BCM ピン固定一覧（含む `26`） |
| 操作 | `GpioPort.export` / `read` / `write` / `unexport` → `gpio.export` / `read` / `write` / `unexport` |
| 依存 | `protocol` / `gpio` / `core`。`node-runtime` には依存しない |
| 非対象 | `gpio.subscribe` / `onchange`（Phase 5） |

利用例:

```ts
await installBrowserPolyfill({ url: 'ws://localhost:33330/' });
const access = await navigator.requestGPIOAccess();
const port = access.ports.get(26);
```

## 後続 Issue

| Issue | 内容 |
| --- | --- |
| #32 | GPIO protocol operations の runtime 対応詳細（本節で完了） |
| #33 | I2C protocol operations の runtime 対応詳細（本節で完了） |
| #34 | encode / decode（本節「Wire format」で完了） |
| #35 | `libs/browser-polyfill` 作成（完了） |
| #36 | WebSocket client transport（本節で完了） |
| #37 | `navigator.requestGPIOAccess()`（本節「Browser GPIO polyfill 入口」で完了） |
| #38 | `navigator.requestI2CAccess()` |

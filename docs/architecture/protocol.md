# Protocol message model

Browser Polyfill と Node Runtime（`apps/server`）の間の通信契約を `libs/protocol` に集約する。

本ドキュメントは Issue #31 時点の **型としてのメッセージ封筒** と、既存 CHIRIMEN（`polyfill.js` / `srv.js`）の function id 方式からの継承・変更方針、および Issue #32 の **GPIO protocol ↔ Node Runtime 対応** を記録する。

関連:

- 親 Issue: [#3 Phase 3-4: Protocol and Browser Polyfill](https://github.com/gurezo/chirimen-raspi-docker/issues/3)
- 子 Issue: [#31 Protocol message model を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/31)
- 子 Issue: [#32 GPIO protocol operations を定義する](https://github.com/gurezo/chirimen-raspi-docker/issues/32)
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
- GPIO の runtime 対応詳細は #32 で確定。I2C は #33、数値 function id の encode / decode は #34

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
| GPIO `0x10`–`0x14` / I2C `0x20`–`0x23` の操作集合の概念 | TS 上は文字列 `operation`。GPIO runtime 対応は #32。数値 code の wire 変換は #34 |
| リクエスト相関 ID | 名称を `requestId` に。`sessionId` と分離 |
| GPIO onchange を非同期 event として送る | `kind: 'event'` を明示 |
| OK / NG 判定 | `ChirimenErrorPayload`（`code` + `message`）による構造化 error response |
| I2C を少数 function にパックする実装 | domain API（`I2CSlaveDevice`）に近い 1:1 operation 名 |

## 依存境界

`libs/protocol`（`layer:protocol`）は `libs/core`（`layer:core`）のみに依存する。`gpio` / `i2c` / `node-runtime` / `browser-polyfill` には依存しない。

詳細は [nx-boundaries.md](./nx-boundaries.md) を参照。

## 後続 Issue

| Issue | 内容 |
| --- | --- |
| #32 | GPIO protocol operations の runtime 対応詳細（本節で完了） |
| #33 | I2C protocol operations の runtime 対応詳細 |
| #34 | encode / decode |
| #35–#38 | browser-polyfill / WebSocket transport |

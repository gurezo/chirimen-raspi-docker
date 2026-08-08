# chirimen-raspi-docker
Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Docker Runtime

## Phase 1: Nx workspace / server / Docker 最小構成

このリポジトリは、Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Runtime を Docker / TypeScript / Nx Workspace ベースで再構築するための Monorepo です。

Phase 1 では、以下の最小構成を提供します。

- `apps/server`: Express ベースの最小 server
- `libs/core`: 共通 runtime health 型
- `libs/gpio`: GPIO domain の最小型
- `libs/i2c`: I2C domain の最小型
- `libs/node-runtime`: Node.js Runtime context の最小実装
- `docker/server/Dockerfile`: server 用 Docker image
- `compose.yaml`: server 起動用 Docker Compose 設定

GPIO domain / node-web-gpio adapter（Phase 2A）は実装済みです。Docker Compose では `/dev/gpiomem` と `/sys/class/gpio` を container に通し、Raspberry Pi 上で GPIO を利用できます。I2C domain（`libs/i2c`）と node-web-i2c adapter（`libs/node-runtime`）は追加済みで、`I2cSession` で device の open / close / closeAll（session lifecycle）を管理できます。Docker への `/dev/i2c-1` 通しは別 Issue の対象です。

### I2C read / write と node-web-i2c の対応

domain `I2CSlaveDevice`（CHIRIMEN polyfill 互換）の各操作は、同名の `node-web-i2c` API へ委譲します。

| domain / polyfill | node-web-i2c | 備考 |
| --- | --- | --- |
| `read8(reg)` | `read8(reg)` | レジスタ 8-bit 読み取り |
| `read16(reg)` | `read16(reg)` | レジスタ 16-bit 読み取り |
| `write8(reg, value)` | `write8(reg, value)` | native の戻り値 `number` は破棄し `void` |
| `write16(reg, value)` | `write16(reg, value)` | 同上 |
| `readByte()` | `readByte()` | レジスタ無し raw 1 byte（Web I2C 仕様外） |
| `writeByte(byte)` | `writeByte(byte)` | 同上。domain は `void` |
| `readBytes(length)` | `readBytes(length)` | `length` は 1–127。戻り値 `Uint8Array` |
| `writeBytes(bytes)` | `writeBytes(bytes)` | 各要素を byte として検証。戻り値 `Uint8Array` |

## 必要環境

- Node.js
- pnpm v11.x
- Docker
- Docker Compose

## ローカル開発

```sh
pnpm install
npx nx show projects
npx nx build server
```

Nx graph は以下で確認できます。

```sh
npx nx graph
```

## Nx MCP (Cursor)

Cursor で Nx workspace の context を AI agent に提供するため、`.cursor/mcp.json` に Nx MCP 設定を含めています。

1. Cursor Settings → MCP で `nx-mcp` が有効になっていることを確認する
2. 反映されない場合は Cursor を再起動する
3. 以下で MCP コマンドが利用可能か確認できる

```sh
npx nx mcp --help
```

## Docker で起動

```sh
docker compose up --build
```

server は default で `33330` 番 port を使用します。

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

## Raspberry Pi 上での GPIO（Docker）

`compose.yaml` は `privileged: true` を使わず、次だけを container に渡します。

- `devices`: `/dev/gpiomem`
- `volumes`: `/sys/class/gpio`（`node-web-gpio` が sysfs 経由で GPIO を操作するため）

### host の事前確認

Raspberry Pi 実機で次を確認します。

```sh
ls -l /dev/gpiomem
ls -l /sys/class/gpio
getent group gpio
```

- `/dev/gpiomem` と `/sys/class/gpio` が存在すること
- `gpio` グループの GID を控えておくこと（将来 container を non-root 化する際に `group_add` で合わせる）

現在の server image は root で起動するため、当面 `group_add` は必須ではありません。

### 起動と検証

```sh
docker compose up --build
```

container 内で device / sysfs が見えること:

```sh
docker compose exec chirimen-server ls -l /dev/gpiomem /sys/class/gpio
```

`node-web-gpio` の初期化（`requestGPIOAccess()`）が例外なく完了すること。可能なら 1 pin の `export` / `write` / `unexport` まで試し、Permission denied が出ないことを確認します。

### Raspberry Pi 3 / 4 と 5 の違い

- **Pi 3 / 4**: `/dev/gpiomem` が一般的です。`compose.yaml` の設定で十分な想定です。
- **Pi 5**: `/dev/gpiomem` が無い、または `/dev/gpiochip*`（例: `gpiochip0`）が主になる場合があります。不足する場合は host で `ls -l /dev/gpiomem* /dev/gpiochip*` を確認し、必要な device を compose の `devices` に追加してください。存在しない device を並べると Pi 3 / 4 で起動に失敗するため、共通の `compose.yaml` には入れていません。

### 非 Pi（macOS など）での注意

`/dev/gpiomem` が無い環境では `docker compose up` が失敗します。GPIO の検証は Raspberry Pi 上で行ってください。非 Pi では次のいずれかで TypeScript / server 開発を続けられます。

- `compose.yaml` の `devices` / `volumes` を一時的に外す
- `npx nx build server` やローカル実行（`nx serve` 等）を使う

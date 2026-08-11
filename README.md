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
- `compose.yaml`: server 起動用 Docker Compose 設定（sysfs GPIO 常時 mount）
- `scripts/start.sh`: capability-aware な Docker 起動入口

GPIO domain / node-web-gpio adapter（Phase 2A）は実装済みです。推奨起動は `scripts/start.sh` で、host に存在する GPIO / I2C device だけを capability-aware に container へ通します（`/sys/class/gpio` と `/sys/devices` は常時、`/dev/gpiomem*` / `/dev/gpiochip*` / `/dev/i2c-1` は存在時のみ）。I2C domain（`libs/i2c`）と node-web-i2c adapter（`libs/node-runtime`）は追加済みで、`I2cSession` で device の open / close / closeAll（session lifecycle）と scan を管理できます。

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

### I2C Scan

Node Runtime（`libs/node-runtime`）に I2C bus 上の応答 slave address を走査する API があります（Web I2C 仕様外 / chirimen-server 参照実装互換）。

- 走査範囲: `0x03`–`0x77`（`I2C_SCAN_ADDRESS_MIN` / `I2C_SCAN_ADDRESS_MAX`）
- probe: 各 address で `open` + `writeByte(0x00)`。両方成功した address を返す
- address 単位の失敗は無視（応答なし）。不正 / 未存在 port は `ChirimenError(InvalidAccess)`
- scan 中の open は `I2cSession` の opened map に載せない

```ts
import { createI2cSession, requestNodeI2CAccess, scanI2cPort } from 'node-runtime';

const access = await requestNodeI2CAccess();
const session = createI2cSession(access);
const addresses = await session.scan(1); // I2CSlaveAddress[]

// または port を直接渡す
const port = access.ports.get(1);
if (port) {
  const found = await scanI2cPort(port);
}
```

## 必要環境

- Node.js
- pnpm v11.x
- Docker
- Docker Compose

依存は root の `package.json` に集約した統合型 Nx モノレポ構成です。`apps/*` / `libs/*` に個別の `package.json` はありません。project 間の import（例: `from 'node-runtime'`）は `tsconfig.base.json` の `paths` で解決します。

## Documentation

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

初めての利用者はガイドから始めてください。

| ドキュメント | 内容 |
| --- | --- |
| [docs/guides/getting-started.md](docs/guides/getting-started.md) | clone → doctor → `./scripts/start.sh` → health check |
| [docs/guides/raspberry-pi-setup.md](docs/guides/raspberry-pi-setup.md) | Pi 上の Docker / GPIO / I2C セットアップ |
| [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md) | よくある起動・device 障害 |
| [docs/architecture/overview.md](docs/architecture/overview.md) | アーキテクチャ概要 |
| [docs/architecture/docker.md](docs/architecture/docker.md) | Docker / Compose / device mount |
| [docs/architecture/protocol.md](docs/architecture/protocol.md) | Protocol メッセージモデル |
| [docs/architecture/nx-boundaries.md](docs/architecture/nx-boundaries.md) | Nx tags / module boundaries |

公開 TypeScript API は [API リファレンス](https://gurezo.github.io/chirimen-raspi-docker/api/) を参照してください。ローカル生成手順は下記「API ドキュメント（Typedoc）」を参照してください。

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

## API ドキュメント（Typedoc）

公開 TypeScript API（`gpio` / `i2c` / `protocol` / `browser-polyfill`）のリファレンスは次で閲覧できます。

- Web: https://gurezo.github.io/chirimen-raspi-docker/api/
- テーマ: [typedoc-rhineai-theme](https://www.npmjs.com/package/typedoc-rhineai-theme)

ローカルでは次で生成します。

```sh
pnpm docs:api
```

生成物は `docs/api/` に出力されます（git 管理外）。`main` への push で GitHub Pages に公開されます。

## Nx MCP (Cursor)

Cursor で Nx workspace の context を AI agent に提供するため、`.cursor/mcp.json` に Nx MCP 設定を含めています。

1. Cursor Settings → MCP で `nx-mcp` が有効になっていることを確認する
2. 反映されない場合は Cursor を再起動する
3. 以下で MCP コマンドが利用可能か確認できる

```sh
npx nx mcp --help
```

## Docker で起動

推奨入口は `scripts/start.sh` です。host 上の hardware path を探査し、存在する device だけを Compose override で渡します（Pi 3 / 4 / 5 で同一手順、モデル別の compose 手編集は不要）。

```sh
chmod +x scripts/start.sh
./scripts/start.sh
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

## Raspberry Pi 上での事前診断（doctor）

`./scripts/start.sh` の前に、host の前提条件を一括確認できます。

```sh
chmod +x scripts/doctor.sh
./scripts/doctor.sh
```

`scripts/doctor.sh` は sudo 不要で、次を確認します。

- Raspberry Pi model
- architecture（`aarch64` / `armv7l`）
- Docker（インストールと daemon 稼働）
- Docker Compose
- hardware capabilities（Server / Node Runtime と同じ判定基準）
  - `/sys/class/gpio`
  - `/dev/gpiomem*`
  - `/dev/gpiochip*`
  - `/dev/i2c-1`

結果は `[ok]` / `[error]` / `[warn]` で表示されます。末尾に server startup と同じ語彙の `[ capabilities ] gpio=... i2c=...` が出ます。`[error]` がある場合は exit 1 です。

- **GPIO `sysfs`**: `/sys/class/gpio` があり、現行 backend で利用可能
- **GPIO `gpiochip`**: sysfs が無く `/dev/gpiochip*` のみ → `[warn]` + unsupported（backend 未実装）
- **GPIO `unavailable`**: GPIO interface が無い → `[warn]`
- **I2C `unavailable`**: `[error]` とともに `scripts/enable-i2c.sh` の実行案内が表示されます
- **非 Pi 環境**: Pi / device 関連が `[error]` / `[warn]` になり、Raspberry Pi 実機での検証が必要なことが分かります

## Raspberry Pi 上での GPIO（Docker）

`privileged: true` は使いません。`compose.yaml` は `/sys/class/gpio` と `/sys/devices` を常時 mount し、任意 device は `scripts/start.sh` が host に存在するときだけ追加します。

- `volumes`（常時）: `/sys/class/gpio`（export / unexport）と `/sys/devices`（gpioN の direction / value。class だけでは EROFS になる）
- `devices`（存在時のみ）: `/dev/gpiomem*`（任意。Runtime の必須条件ではない）
- `devices`（存在時のみ）: `/dev/gpiochip*`（将来 backend 用。現状は unsupported）

### host の事前確認

Raspberry Pi 実機で次を確認します。

```sh
ls -l /sys/class/gpio
ls -l /dev/gpiomem* /dev/gpiochip*
getent group gpio
```

- `/sys/class/gpio` があること（現行 sysfs backend）
- `/dev/gpiomem*` は任意（無くても sysfs があれば GPIO は利用可能）
- `gpio` グループの GID を控えておくこと（将来 container を non-root 化する際に `group_add` で合わせる）

現在の server image は root で起動するため、当面 `group_add` は必須ではありません。

### 起動と検証

```sh
chmod +x scripts/start.sh
./scripts/start.sh
```

container 内で sysfs / 渡した device が見えること:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* 2>/dev/null || true
```

`node-web-gpio` の初期化（`requestGPIOAccess()`）が例外なく完了すること。可能なら 1 pin の `export` / `write` / `unexport` まで試し、Permission denied が出ないことを確認します。

### Raspberry Pi 3 / 4 と 5 の違い

- **Pi 3 / 4 / 5**: いずれも `./scripts/start.sh` で同一手順。存在する device だけが渡るため、モデルごとに `compose.yaml` を編集する必要はありません
- **`gpiomem`**: Pi 3 / 4 では一般的。Pi 5 では無いことがある（任意パス）
- **`gpiochip*`**: 存在すれば container にも渡る。gpiochip backend は未実装のため、sysfs が無い場合は GPIO unavailable

### 非 Pi（macOS など）での注意

任意 device が無くても `./scripts/start.sh` は起動を試みます（GPIO / I2C は unavailable）。実機検証は Raspberry Pi 上で行ってください。TypeScript / server 開発だけなら次でも続けられます。

- `npx nx build server` やローカル実行（`nx serve` 等）を使う

## Raspberry Pi 上での I2C（Docker）

`privileged: true` は使いません。`/dev/i2c-1` は host に存在するときだけ `scripts/start.sh` が `devices` に追加します。

### host の事前確認

Raspberry Pi 実機で次を確認します。

```sh
ls -l /dev/i2c-1
getent group i2c
```

- `/dev/i2c-1` が存在すること
- `i2c` グループの GID を控えておくこと（将来 container を non-root 化する際に `group_add` で合わせる）

現在の server image は root で起動するため、当面 `group_add` は必須ではありません。

### host で I2C を有効化する

I2C が無効な場合、host で有効化してから container を起動します。

#### script で有効化する（推奨）

```sh
chmod +x scripts/enable-i2c.sh
sudo ./scripts/enable-i2c.sh
sudo reboot
sudo ./scripts/enable-i2c.sh --check
```

`--check` は reboot 後に `/dev/i2c-1` と `i2c` グループを確認します。script は `raspi-config` で I2C を有効化し、必要なら boot config に `dtparam=i2c_arm=on` を追加します。**reboot が必要**です。

#### 手動で有効化する

1. `sudo raspi-config` → Interface Options → I2C → Enable
2. または `/boot/firmware/config.txt`（Bookworm）に `dtparam=i2c_arm=on` を追加
3. reboot 後、`ls -l /dev/i2c-1` で device を確認

### 起動と検証

```sh
./scripts/start.sh
```

container 内で device が見えること:

```sh
docker compose exec chirimen-server ls -l /dev/i2c-1
```

`requestNodeI2CAccess()` が例外なく完了し、port `1` の `open` が Permission denied にならないこと。可能なら `I2cSession.scan(1)` や slave device の read / write まで試してください。

### device が存在しない場合

`/dev/i2c-1` が host に無くても `./scripts/start.sh` は起動を続けます（当該 device はマッピングしない）。I2C 未有効なら `scripts/enable-i2c.sh` で有効化するか、Nx ローカル実行で開発を続けてください。

Node Runtime 側では I2C device 欠如時、`requestNodeI2CAccess()` が失敗し `NodeRuntimeContext.i2c.available` が `false` になります（server は起動し続けますが、I2C 操作は利用できません）。

### Raspberry Pi 3 / 4 と 5

- **Pi 3 / 4 / 5**: 標準の primary bus は `/dev/i2c-1` です。`./scripts/start.sh` が存在時のみ渡します
- 別名 bus（例: `/dev/i2c-0`）が必要な場合は host で `ls -l /dev/i2c-*` を確認し、必要なら start.sh / Compose override 側の拡張を検討してください（共通の `compose.yaml` には固定列挙しません）

# Troubleshooting

CHIRIMEN Runtime のセットアップ・起動でよくある障害と対処。

関連:

- [Getting Started](./getting-started.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)
- [Docker 構成](../architecture/docker.md)

## device が無く GPIO / I2C が unavailable になる

### 症状

- doctor / server が `gpio=unavailable` や `i2c=unavailable` を出す
- container 内に期待した `/dev/*` が無い
- （旧手順で）固定 `devices` を並べた `docker compose up` が欠如 path で失敗する

### 確認

```sh
./scripts/doctor.sh
ls -l /sys/class/gpio /dev/gpiomem* /dev/gpiochip* /dev/i2c-1
./scripts/start.sh --help
```

起動時の `mapping:` 行で、実際に渡した path を確認する。

### 対処

| 原因 | 対処 |
| --- | --- |
| I2C 未有効 | [raspberry-pi-setup.md](./raspberry-pi-setup.md) の I2C 手順（`scripts/enable-i2c.sh` → reboot → `--check`） |
| GPIO sysfs 不足 | host で `/sys/class/gpio` を確認。無い場合は gpiochip のみになることがある（現状 unsupported） |
| 推奨入口を使っていない | `./scripts/start.sh` を使う（存在する device だけを渡す） |
| 非 Pi 環境 | 下記「非 Pi 環境」を参照 |

`compose.yaml` に任意 device を固定列挙しない。`scripts/start.sh` が capability-aware に追加する。

## I2C が使えない / scan が空

### 症状

- doctor で `i2c=unavailable` / `/dev/i2c-1` が `[error]`
- container 内に `/dev/i2c-1` が無い
- `requestNodeI2CAccess()` が失敗し、Runtime 上で I2C が unavailable

### 対処

1. host で I2C を有効化して reboot する（[raspberry-pi-setup.md](./raspberry-pi-setup.md)）
2. `sudo ./scripts/enable-i2c.sh --check`
3. `./scripts/start.sh` し直し、`docker compose exec chirimen-server ls -l /dev/i2c-1`

slave が接続されていない場合、scan 結果が空になるのは正常なことがある。配線とアドレスを確認する。

## Permission denied（GPIO / I2C）

### 症状

`export` / `write` / I2C `open` などで Permission denied。

### 確認

```sh
ls -l /dev/gpiomem* /dev/i2c-1 /sys/class/gpio
getent group gpio
getent group i2c
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/i2c-1 2>/dev/null || true
```

### 対処

- 現行 image は root 起動のため、まずは host 側に device / sysfs が存在し、`start.sh` の mapping が効いているかを確認する
- mount 漏れなら [docker.md](../architecture/docker.md) の devices / volumes を見直す
- 将来 non-root 化する場合は、host の `gpio` / `i2c` グループ GID を `group_add` で合わせる

## GPIO export で EROFS（read-only file system）

### 症状

container 内で `node-web-gpio` の `export` が次で失敗する。

```text
OperationError: Error: EROFS: read-only file system, open '/sys/class/gpio/gpioN/direction'
```

host 上の `/sys/class/gpio` への書き込みは成功することがある。

### 原因

container の `/sys` は通常 read-only。`/sys/class/gpio` だけを bind すると `export` は通るが、作られる `gpioN` は `/sys/devices/...` への symlink のため、`direction` / `value` 書き込みが read-only な `/sys` に当たる。

### 確認

```sh
docker compose exec chirimen-server sh -c 'mount | grep -E "sys|gpio"; ls -l /sys/class/gpio/gpio* 2>/dev/null | head'
```

`/sys` が `ro` で `/sys/class/gpio` だけが `rw`、かつ `gpioN` が `../../devices/...` を指していればこの症状。

### 対処

`compose.yaml` で `/sys/class/gpio` に加え `/sys/devices` も mount する（現行 main）。再作成後に再試行する。

```sh
./scripts/start.sh --force-recreate
```

## health は OK だが I2C が unavailable

### 症状

`curl http://localhost:33330/health` は成功するが、I2C 操作ができない。

### 説明

server プロセス自体は起動し続ける。I2C device 欠如時は `requestNodeI2CAccess()` が失敗し、`NodeRuntimeContext.i2c.available` が `false` になる（GPIO と同様、device が無いと該当機能だけ使えない）。

### 対処

host で `/dev/i2c-1` を用意してから `./scripts/start.sh` で container を再作成する。

## Pi 5 で GPIO が不明 / gpiochip unsupported

### 症状

- doctor が `gpio=gpiochip` と `[warn]`（unsupported）を出す
- または doctor / server が `gpio=unavailable` になる
- GPIO 初期化に失敗する

### 確認

```sh
./scripts/doctor.sh
ls -l /sys/class/gpio /dev/gpiomem* /dev/gpiochip*
```

doctor の `[ capabilities ]` 行は server startup log と同じ backend 名になる。

### 対処

- `/sys/class/gpio` があれば Runtime は `sysfs` backend を使う（現行の実装経路）
- sysfs が無く `/dev/gpiochip*` のみの場合、現状は backend 未実装のため GPIO は利用できない（doctor / server とも unsupported と表示）
- `./scripts/start.sh` は存在する `gpiochip*` を container に渡す（detection 揃え用）。backend 実装は別 Issue

### 実機メモ（#97 / #98 / #99）

- **Pi 3 B+（#97）**: 64-bit OS（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `scripts/enable-i2c.sh` 等で有効化する。A+ は未検証
- **Pi 4（#98）**: 64-bit OS（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `scripts/enable-i2c.sh` 等で有効化する
- **Pi 5（#99）**: Model B Rev 1.0 では `/sys/class/gpio` が存在し `gpio=sysfs` で動作確認済み。gpiochip 専用 backend は不要。container 内で `EROFS` になる場合は上記「GPIO export で EROFS」を参照（`/sys/devices` mount）

## Docker build が `i2c-bus` / `node-gyp` で失敗する

### 症状

`./scripts/start.sh` や `docker compose up --build` で次のようなエラーになる。

```text
.../i2c-bus@... install$ node-gyp rebuild
gyp ERR! find Python
Could not find any Python installation to use
```

### 原因

`node-web-i2c` が依存する `i2c-bus` は install 時に native rebuild する。`node:bookworm-slim` だけでは Python / コンパイラが無い。

### 対処

[`docker/server/Dockerfile`](../../docker/server/Dockerfile) の `deps` ステージに `python3` / `make` / `g++` が入っていること（現行 main）を確認し、再ビルドする。

```sh
./scripts/start.sh --build --force-recreate
```

`runtime` ステージは slim の `base` から作るため、最終 image に build tools は残らない。詳細は [Docker 構成](../architecture/docker.md)。

## 非 Pi 環境（macOS など）

### 症状

host に `/dev/gpiomem` や `/dev/i2c-1` が無い。GPIO / I2C は使えない。

### 対処（開発継続）

- `./scripts/start.sh` で任意 device なし起動を試みる（GPIO / I2C 検証は不可）
- またはローカルで TypeScript / server 開発する:

```sh
pnpm install
npx nx build server
npx nx serve server
```

GPIO / I2C の実機検証は Raspberry Pi 上で行う。

## doctor が exit 1 になる

`[error]` の行を上から解消する。典型順:

1. Raspberry Pi 実機か
2. Docker / Compose / daemon
3. `/dev/i2c-1`（`enable-i2c.sh`）— `i2c=unavailable` は error
4. GPIO は `unavailable` / `gpiochip` unsupported でも `[warn]`（exit 0 可）。必要なら `/sys/class/gpio` と `/dev/gpiochip*` を確認

解消後に Getting Started へ戻る: [getting-started.md](./getting-started.md)

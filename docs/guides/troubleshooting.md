# Troubleshooting

CHIRIMEN Runtime のセットアップ・起動でよくある障害と対処。

関連:

- [Getting Started](./getting-started.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)
- [Docker 構成](../architecture/docker.md)

## `docker compose up` が device 欠如で失敗する

### 症状

`/dev/gpiomem` や `/dev/i2c-1` が host に無いと、Compose が起動に失敗する。

### 確認

```sh
./scripts/doctor.sh
ls -l /sys/class/gpio /dev/gpiomem* /dev/gpiochip* /dev/i2c-1
```

### 対処

| 原因 | 対処 |
| --- | --- |
| I2C 未有効 | [raspberry-pi-setup.md](./raspberry-pi-setup.md) の I2C 手順（`scripts/enable-i2c.sh` → reboot → `--check`） |
| GPIO device 不足（特に Pi 5） | host で `ls -l /dev/gpiomem* /dev/gpiochip*` を確認し、必要な device を `compose.yaml` の `devices` に追加 |
| 非 Pi 環境 | 下記「非 Pi 環境」を参照 |

存在しない device を共通の `compose.yaml` に並べると、他機種で起動に失敗するため、追加は必要な host だけに限定する。

## I2C が使えない / scan が空

### 症状

- doctor で `i2c=unavailable` / `/dev/i2c-1` が `[error]`
- container 内に `/dev/i2c-1` が無い
- `requestNodeI2CAccess()` が失敗し、Runtime 上で I2C が unavailable

### 対処

1. host で I2C を有効化して reboot する（[raspberry-pi-setup.md](./raspberry-pi-setup.md)）
2. `sudo ./scripts/enable-i2c.sh --check`
3. `docker compose up --build` し直し、`docker compose exec chirimen-server ls -l /dev/i2c-1`

slave が接続されていない場合、scan 結果が空になるのは正常なことがある。配線とアドレスを確認する。

## Permission denied（GPIO / I2C）

### 症状

`export` / `write` / I2C `open` などで Permission denied。

### 確認

```sh
ls -l /dev/gpiomem /dev/i2c-1 /sys/class/gpio
getent group gpio
getent group i2c
docker compose exec chirimen-server ls -l /dev/gpiomem /dev/i2c-1 /sys/class/gpio
```

### 対処

- 現行 image は root 起動のため、まずは host 側に device / sysfs が存在し、Compose の mount が効いているかを確認する
- mount 漏れなら [docker.md](../architecture/docker.md) の devices / volumes を見直す
- 将来 non-root 化する場合は、host の `gpio` / `i2c` グループ GID を `group_add` で合わせる

## health は OK だが I2C が unavailable

### 症状

`curl http://localhost:33330/health` は成功するが、I2C 操作ができない。

### 説明

server プロセス自体は起動し続ける。I2C device 欠如時は `requestNodeI2CAccess()` が失敗し、`NodeRuntimeContext.i2c.available` が `false` になる（GPIO と同様、device が無いと該当機能だけ使えない）。

### 対処

host / container の `/dev/i2c-1` を直し、必要なら container を再作成する。

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
- Docker で必要な `gpiochip*` などを通す場合は `compose.yaml` の `devices` に追加する。共通 yaml への無条件追加は避ける（Pi 3 / 4 で起動失敗の原因になる）

## 非 Pi 環境（macOS など）

### 症状

`/dev/gpiomem` や `/dev/i2c-1` が無く `docker compose up` が失敗する。

### 対処（開発継続）

- `compose.yaml` の `devices` / `volumes` を一時的に外す（GPIO / I2C 検証は不可）
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

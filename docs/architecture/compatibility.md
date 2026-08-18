# Compatibility matrix

Raspberry Pi 上の CHIRIMEN Runtime の対応状態を、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#196 docs/architecture/docker.md から Compatibility matrix を分離](https://github.com/gurezo/chirimen-raspi-docker/issues/196)
- 実機検証: [#97 Pi 3 B+](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#98 Pi 4](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / [#99 Pi 5](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#135 32-bit](https://github.com/gurezo/chirimen-raspi-docker/issues/135) / [#116 I2C Scan](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- [overview.md](./overview.md)
- [docker.md](./docker.md)
- [Getting Started](../guides/getting-started.md)
- [Raspberry Pi setup](../guides/raspberry-pi-setup.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)

## 推奨環境

サポート対象は **Raspberry Pi 3 B+ / 4 / 5** の **Raspbian OS 64-bit**（`aarch64`）である。Runtime の Node 24 は Docker image 内で使う。

### 対応

- Raspberry Pi 3 B+（Raspbian OS 64-bit）
- Raspberry Pi 4（Raspbian OS 64-bit）
- Raspberry Pi 5（Raspbian OS 64-bit）

### サポート対象外

- Raspberry Pi 3 A+（ハードウェアスペック不足）
- 32-bit OS（Verified でも `Supported` と書かない）

## Compatibility matrix

Raspberry Pi 3 / 4 / 5 の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。**サポート対象は Raspbian OS 64-bit** である。32-bit OS はサポート対象外。32-bit の Verified 行は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の記録として残し、`Supported` とは書かない。未検証項目も `Supported` と書かない。

- **Browser E2E**: 実ブラウザ + polyfill UI ではなく、container 内 WebSocket クライアントによる protocol E2E。`Supported` とは書かない。web-demo の I2C Scan は下記「I2C Scan 実機検証（#116）」
- **I2C**: 初期状態で `/dev/i2c-1` が無い場合あり。有効化後に `i2c-dev`。既知 slave（ADT7410 / `0x48`）の Browser Scan は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- 詳細は下記の Pi 3 B+（#97） / Pi 4（#98） / Pi 5（#99）実機検証。32-bit の記録は #135（サポート対象外）

### Raspberry Pi 3 A+

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | Not verified |

ハードウェアスペック不足のためサポート対象外。`Supported` と書かない。

### Raspberry Pi 3 B+

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v7` | `armv7l` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。32-bit は `armv7l` + Node 22 / `Dockerfile.32bit`。

### Raspberry Pi 4

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。Pi 4 の 32-bit OS は 64-bit kernel（`aarch64` / `v8`）が default。検証済み機種は Model B Rev 1.4。

### Raspberry Pi 5

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-2712` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` / `write` / `unexport` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。Pi 5 の 32-bit OS は 64-bit kernel（`aarch64` / `v8`）が default（64-bit OS の `2712` とは異なる）。検証済み機種は Model B Rev 1.0。

## Raspberry Pi 3 / 4 と 5

- **同一手順**: Pi 3 / 4 / 5 とも `./scripts/start.sh`。モデルごとの `compose.yaml` 手編集は不要
- **`gpiomem`**: Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（Runtime の必須条件ではない）
- **`gpiochip*`**: 存在すれば渡る。backend 未実装のため、sysfs が無い場合は GPIO unavailable
- **I2C**: primary bus は `/dev/i2c-1` 想定。存在するときだけ渡す

### Pi 3 B+ 実機検証（#97）

Raspberry Pi 3 Model B+（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | I2C 有効化後に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える |
| known limitations | Raspbian OS 32-bit の Runtime E2E は下記「Pi 3 B+ 32-bit 実機検証（#135）」 |

### Pi 3 B+ 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 3 Model B+（Raspbian OS 32-bit / `armv7l` / kernel `6.18.34+rpt-rpi-v7`）での Runtime E2E 記録。32-bit では Node 24 公式 image に `linux/arm/v7` が無いため、当時は `./scripts/start.sh --32bit` が [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit)（Node 22）を選んだ。

| 項目 | 結果 |
| --- | --- |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（esbuild bundle） |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

### Pi 4 実機検証（#98）

Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（`./scripts/start.sh --64bit`） |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | I2C 有効化後に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| known limitations | Raspbian OS 32-bit は下記「Pi 4 32-bit 実機検証（#135）」 |

### Pi 4 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。Pi 4 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（Pi 3 B+ 32-bit の `armv7l` / `v7` とは異なる）。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| known limitations | サポート対象外。`uname -m` が `aarch64` のため当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

### Pi 5 実機検証（#99）

Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（`./scripts/start.sh --64bit`） |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | Case A。`node-web-gpio` の read (`in`) / write (`out`) 成功。gpiochip 専用 backend は不要 |
| I2C | `requestI2CAccess` + port `1` scan 成功（slave 未接続時は空配列で可）。既知 slave の Browser Scan は下記「I2C Scan 実機検証（#116）」 |
| WebSocket | 接続、および `gpio.export` / `write` / `unexport` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| volumes | `/sys/class/gpio` に加え `/sys/devices` が必要（無いと container 内で EROFS） |
| known limitations | Raspbian OS 32-bit は下記「Pi 5 32-bit 実機検証（#135）」 |

### Pi 5 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。Pi 5 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（64-bit OS の kernel `2712` とは異なる。Pi 3 B+ 32-bit の `armv7l` / `v7` とも異なる）。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（当時 `./scripts/start.sh --32bit`、esbuild bundle） |
| known limitations | サポート対象外。`uname -m` が `aarch64` のため当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた。native rebuild の `EAI_AGAIN` は [#167](https://github.com/gurezo/chirimen-raspi-docker/pull/167) の `nodedir` 設定で回避する |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

host 側の有効化・診断は [raspberry-pi-setup.md](../guides/raspberry-pi-setup.md) と `scripts/doctor.sh` / `scripts/enable-i2c.sh` を参照。

### I2C Scan 実機検証（#116）

検証用 slave は **ADT7410**（expected `0x48`）。配線の正本は [i2c-scan.md](../examples/i2c-scan.md)。センサ機能 Example は対象外。

| 項目 | 結果 |
| --- | --- |
| device | ADT7410。A0 / A1 = GND → address `0x48` |
| I2C1 pins | Pi 3 / 4 / 5 で物理 pin 3 = SDA（BCM 2）、pin 5 = SCL（BCM 3）。モデルごとに配線を変えない |
| host `/dev/i2c-1` | Pi 3 B+（#97）/ Pi 4（#98）/ Pi 5（#99）で確認済み。初期状態で無い場合は `scripts/enable-i2c.sh` |
| Runtime scan | Pi 5（#99、Raspbian OS 64-bit / `aarch64` / `6.18.34+rpt-rpi-2712`）で `requestI2CAccess` + port `1` scan 成功。slave 未接続時は空配列 |
| Browser Scan | web-demo `#/i2c-scan`。probe は Runtime `scanI2cPort` と同じ `open` + `writeByte(0x00)`（範囲 `0x03`–`0x77`）。[#114](https://github.com/gurezo/chirimen-raspi-docker/issues/114) / [#115](https://github.com/gurezo/chirimen-raspi-docker/issues/115) |
| expected | 配線後 Scan で hex 一覧に `0x48`。空配列は本検証では失敗 |
| Browser E2E 列 | Compatibility matrix の Browser E2E は protocol E2E のまま。実ブラウザ Scan は本節 |

GPIO26（LED）/ GPIO5（スイッチ）とはピンが重ならない。

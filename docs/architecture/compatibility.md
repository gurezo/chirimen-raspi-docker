# Compatibility matrix

Raspberry Pi 上の CHIRIMEN Runtime の対応状態を、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#196 docs/architecture/docker.md から Compatibility matrix を分離](https://github.com/gurezo/chirimen-raspi-docker/issues/196)
- 実機検証: [#97 Pi 3 B+](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#98 Pi 4](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / [#99 Pi 5](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116 I2C Scan](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / [#219 I2C Host Setup](https://github.com/gurezo/chirimen-raspi-docker/issues/219)
- 32-bit 記録: [32-bit Compatibility](./compatibility-32bit.md)（[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）
- [overview.md](./overview.md)
- [docker.md](./docker.md)
- [Getting Started](../guides/getting-started.md)
- [Raspberry Pi setup](../guides/raspberry-pi-setup.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)

## Supported / Verified Environment

サポート対象は **Raspberry Pi 3 B+ / 4 / 5** の **Raspberry Pi OS 64-bit**（`aarch64`）である。Runtime の Node 24 は Docker image 内で使う。

| Model | 64-bit OS | GPIO | I2C | Status |
| --- | --- | --- | --- | --- |
| Raspberry Pi 3 B+ | Yes | Verified | Verified | Verified |
| Raspberry Pi 4 | Yes | Verified | Verified | Verified |
| Raspberry Pi 5 | Yes | Verified | Verified | Verified |
| Raspberry Pi 3 A+ | — | — | — | Not verified / unsupported |

Recommended: Raspberry Pi OS Lite 64-bit

`Supported` とは書かない。未検証項目も `Supported` と書かない。

> 32-bit OS は非推奨です。過去の実機検証結果と技術的な理由は [32-bit Compatibility](./compatibility-32bit.md) を参照してください。

## Runtime / GPIO / I2C 共通仕様

### Runtime startup

Pi 3 / 4 / 5 とも `./scripts/start.sh`。モデルごとの `compose.yaml` 手編集は不要。

### GPIO capability detection

host に `/sys/class/gpio` があるとき capability は `gpio=sysfs`。sysfs が無い場合は GPIO unavailable。

### gpiomem

Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（Runtime の必須条件ではない）。

### gpiochip

`gpiochip*` は存在すれば渡る。backend 未実装のため、sysfs が無い場合は GPIO unavailable。

### I2C primary bus

primary bus は `/dev/i2c-1` 想定。存在するときだけ渡す。初期状態で無い場合あり。有効化後に `i2c-dev`。

## Verification Details

Raspberry Pi 3 / 4 / 5 の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。**サポート対象は Raspberry Pi OS 64-bit** である。32-bit の記録は [32-bit Compatibility](./compatibility-32bit.md)（[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）。`Supported` とは書かない。未検証項目も `Supported` と書かない。

- **Protocol E2E**: 実ブラウザ + polyfill UI ではなく、container 内 WebSocket クライアントによる protocol E2E。`Supported` とは書かない。web-demo の I2C Scan は下記「I2C Scan 実機検証（#116）」
- **I2C**: 初期状態で `/dev/i2c-1` が無い場合あり。有効化後に `i2c-dev`。既知 slave（ADT7410 / `0x48`）の Browser Scan は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- 詳細は下記の Raspberry Pi 3 B+（#97） / 4（#98） / 5（#99）実機検証

### Raspberry Pi 3 A+

ハードウェアスペック不足のためサポート対象外。未検証。`Supported` と書かない。

### Raspberry Pi 3 B+

Raspberry Pi 3 Model B+（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。[#97](https://github.com/gurezo/chirimen-raspi-docker/issues/97)

| Item | Result |
| --- | --- |
| OS | Raspbian OS 64-bit |
| Kernel | `6.18.34+rpt-rpi-v8` |
| Architecture | `aarch64` |
| doctor | — |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| image | — |
| GPIO | sysfs / Verified。capability は `gpio=sysfs`。WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | i2c-dev / Verified。I2C 有効化後に `i2c-dev` backend を選択 |
| Protocol E2E | Verified。接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える |
| volumes | — |
| known limitations | Raspbian OS 32-bit の Runtime E2E は [32-bit Compatibility](./compatibility-32bit.md) の「Raspberry Pi 3 B+ verification」 |

### Raspberry Pi 4

Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。[#98](https://github.com/gurezo/chirimen-raspi-docker/issues/98)

| Item | Result |
| --- | --- |
| OS | Raspbian OS 64-bit |
| Kernel | `6.18.34+rpt-rpi-v8` |
| Architecture | `aarch64` |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（当時 `./scripts/start.sh --64bit`。現行は `./scripts/start.sh` が 64-bit 既定） |
| GPIO | sysfs / Verified。capability は `gpio=sysfs`。WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | i2c-dev / Verified。I2C 有効化後に `i2c-dev` backend を選択 |
| Protocol E2E | Verified。接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| volumes | — |
| known limitations | Raspbian OS 32-bit は [32-bit Compatibility](./compatibility-32bit.md) の「Raspberry Pi 4 verification」 |

### Raspberry Pi 5

Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で次を確認済み。[#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99)

| Item | Result |
| --- | --- |
| OS | Raspbian OS 64-bit |
| Kernel | `6.18.34+rpt-rpi-2712` |
| Architecture | `aarch64` |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（当時 `./scripts/start.sh --64bit`。現行は `./scripts/start.sh` が 64-bit 既定） |
| GPIO | sysfs / Verified。capability は `gpio=sysfs`。Case A。`node-web-gpio` の read (`in`) / write (`out`) 成功。gpiochip 専用 backend は不要 |
| I2C | i2c-dev / Verified。`requestI2CAccess` + port `1` scan 成功（slave 未接続時は空配列で可）。既知 slave の Browser Scan は下記「I2C Scan 実機検証（#116）」 |
| Protocol E2E | Verified。接続、および `gpio.export` / `write` / `unexport` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| volumes | `/sys/class/gpio` に加え `/sys/devices` が必要（無いと container 内で EROFS） |
| known limitations | Raspbian OS 32-bit は [32-bit Compatibility](./compatibility-32bit.md) の「Raspberry Pi 5 verification」 |

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
| Browser E2E 列 | Compatibility の Protocol E2E は protocol E2E のまま。実ブラウザ Scan は本節 |

GPIO26（LED）/ GPIO5（スイッチ）とはピンが重ならない。

### I2C Host Setup → Docker Runtime 実機検証（#219）

[#215](https://github.com/gurezo/chirimen-raspi-docker/issues/215) の正式順（I2C → Docker → doctor → Runtime）を、Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で確認した。ホスト環境と Runtime 結果は [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) と同一機。スクリプト責務は [#216](https://github.com/gurezo/chirimen-raspi-docker/issues/216) / [#217](https://github.com/gurezo/chirimen-raspi-docker/issues/217) / [#218](https://github.com/gurezo/chirimen-raspi-docker/issues/218)。既存の「Raspberry Pi 5」（#99）は上書きしない。

| 項目 | 結果 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 5 Model B Rev 1.0 |
| Raspberry Pi OS version | Raspbian OS 64-bit |
| Kernel version | `6.18.34+rpt-rpi-2712` |
| Architecture | `aarch64` |
| `/dev/i2c-1` | 有効化後に存在（`ls -l /dev/i2c-1`） |
| enable-i2c.sh | `sudo ./scripts/enable-i2c.sh` → reboot。`--check` は sudo 不要で `[ok] /dev/i2c-1 exists`（#216） |
| doctor.sh | All checks passed。`[ok] I2C: available (/dev/i2c-1)`。`[ capabilities ] gpio=sysfs i2c=i2c-dev`。設定は変更しない（#217） |
| Docker startup | 既存導入済み。`./setups/docker.sh` は I2C 設定を変更しない（#218）。Compose は導入済み |
| Runtime health | `./scripts/start.sh` の mapping は `i2c-1=yes`。`curl http://localhost:33330/health` は `{"name":"chirimen-raspi-docker-server","status":"ok","version":"0.0.1"}` |
| I2C Runtime | `docker compose exec chirimen-server ls -l /dev/i2c-1` で device あり。`requestI2CAccess` + port `1` scan 成功（#99） |
| Browser Scan | ADT7410 / `0x48` は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) |
| known limitations | 初期状態で `/dev/i2c-1` が無い場合あり。Docker 済みでは `docker.sh` は idempotent。`Supported` とは書かない |

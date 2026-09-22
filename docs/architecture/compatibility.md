# Compatibility

Raspberry Pi 上の CHIRIMEN Runtime の対応状態を、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。

関連:

- 親 Issue: [#304 Raspberry Pi 3 B+ を Runtime-only とし Docker build を Pi 4 / Pi 5 に限定する Documentation を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/304)
- 子 Issue: [#305 Compatibility に Runtime Support / Docker Build Support を分離して記載する](https://github.com/gurezo/chirimen-raspi-docker/issues/305)
- 実機検証（Getting Started）: [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) / [Pi 3 B+ の build 非推奨コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)
- 親 Issue（歴史）: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue（歴史）: [#196 docs/architecture/docker.md から Compatibility matrix を分離](https://github.com/gurezo/chirimen-raspi-docker/issues/196)
- 実機検証: [#97 Pi 3 B+](https://github.com/gurezo/chirimen-raspi-docker/issues/97) / [#98 Pi 4](https://github.com/gurezo/chirimen-raspi-docker/issues/98) / [#99 Pi 5](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116 I2C Scan](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / [#219 I2C Host Setup](https://github.com/gurezo/chirimen-raspi-docker/issues/219) / [#243 Browser Development Flow](https://github.com/gurezo/chirimen-raspi-docker/issues/243) / [#257 Example Catalog / Runtime Example](https://github.com/gurezo/chirimen-raspi-docker/issues/257)
- 32-bit 記録: [32-bit Compatibility](./compatibility-32bit.md)（[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）
- [overview.md](./overview.md)
- [docker.md](./docker.md)
- [Getting Started](../guides/getting-started.md)
- [Raspberry Pi Setup](../guides/raspberry-pi-setup.md)
- [Browser Development Environment](../guides/browser-development.md)（#243）
- [I2C Scan 検証仕様](../examples/i2c-scan.md)
- [Example Catalog / Runtime Example 実機検証](../examples/runtime-verification.md)（#257）

## Supported / Verified Environment

サポート対象は **Raspberry Pi 3 B+ / 4 / 5** の **Raspberry Pi OS 64-bit**（`aarch64`）である。Runtime の Node 24 は Docker image 内で使う。

| Model | 64-bit OS | GPIO | I2C | Status |
| --- | --- | --- | --- | --- |
| Raspberry Pi 3 B+ | Yes | Verified | Verified | Verified |
| Raspberry Pi 4 | Yes | Verified | Verified | Verified |
| Raspberry Pi 5 | Yes | Verified | Verified | Verified |
| Raspberry Pi 3 A+ | — | — | — | Not verified / unsupported |

通常の推奨環境は **Raspberry Pi OS Lite 64-bit**。

`Supported` とは書かない。未検証項目も `Supported` と書かない。

> 32-bit OS は非推奨です。[詳細を見る](./compatibility-32bit.md)

## Runtime Support

compose `up` / `down` による Runtime 利用の対応。Pi 3 B+ は非対応ではなく **Runtime-only**（compose `up` / `down` 対応、Docker build 非対応）である。

| Model | compose up/down | Role |
| --- | --- | --- |
| Raspberry Pi 3 B+ | Supported | Runtime-only |
| Raspberry Pi 4 | Supported | Runtime / Development |
| Raspberry Pi 5 | Supported | Runtime / Development |

## Development / Docker Build Support

Docker image の build（`docker build` / `compose build` / `up --build`）の対応。Pi 3 B+ では高負荷・高温により安定した build が困難なため Unsupported とする。Build は Raspberry Pi 4 / Pi 5 を対象とする。根拠は [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) および [検証コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)。

| Model | Docker build / `compose build` / `up --build` | Status |
| --- | --- | --- |
| Raspberry Pi 3 B+ | Unsupported | Runtime-only（build 非対応） |
| Raspberry Pi 4 | Supported | Build Supported |
| Raspberry Pi 5 | Supported | Build Supported |

## Runtime / GPIO / I2C 共通仕様

### Runtime startup

Pi 3 / 4 / 5 とも `./scripts/start.sh`（モデルごとの `compose.yaml` 手編集は不要）。引数なしは既定で `--build` 相当のため、対象は次のとおり。

| Model | 推奨コマンド | 備考 |
| --- | --- | --- |
| Raspberry Pi 3 B+ | `./scripts/start.sh --no-build` | Runtime-only。on-device Docker build は Unsupported |
| Raspberry Pi 4 / Pi 5 | `./scripts/start.sh` | 既定で `--build`。Development / Docker Build Supported |

機種別手順の正本は [Getting Started の Step 2](../guides/getting-started.md#step-2-chirimen-setup)。

### GPIO capability detection

host に `/sys/class/gpio` があるとき capability は `gpio=sysfs`。sysfs が無い場合は GPIO unavailable。

### gpiomem

Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（Runtime の必須条件ではない）。

### gpiochip

`gpiochip*` は存在すれば渡る。backend 未実装のため、sysfs が無い場合は GPIO unavailable。

### I2C primary bus

primary bus は `/dev/i2c-1` 想定。存在するときだけ渡す。初期状態で無い場合あり。有効化後に `i2c-dev`。

## Verification Details

Raspberry Pi 3 / 4 / 5 の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。**サポート対象は Raspberry Pi OS 64-bit** である。通常の推奨環境は **Raspberry Pi OS Lite 64-bit**。以下の OS 列は実測記録であり、推奨名へ書き換えない。32-bit の記録は [32-bit Compatibility](./compatibility-32bit.md)（[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)）。`Supported` とは書かない。未検証項目も `Supported` と書かない。

- **Protocol E2E**: 実ブラウザ + polyfill UI ではなく、container 内 WebSocket クライアントによる protocol E2E。`Supported` とは書かない。Browser の I2C Scan は下記「I2C Scan 実機検証（#116）」
- **I2C**: 初期状態で `/dev/i2c-1` が無い場合あり。有効化後に `i2c-dev`。既知 slave（ADT7410 / `0x48`）の Browser Scan は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- **Browser Development Flow**: Editor → Workspace → Example Server → Runtime の一連は下記「Browser Development Flow 実機検証（#243）」。既存の Pi 3 / 4 / 5 節は上書きしない
- **Example Catalog / Runtime Example**: Catalog `:4200` と workspace Example `:4173` の機別記録は [runtime-verification.md](../examples/runtime-verification.md)（[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）。既存の Pi 3 / 4 / 5 節は上書きしない
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

host 側の有効化・診断は [Raspberry Pi Setup](../guides/raspberry-pi-setup.md) と `scripts/doctor.sh` / `setups/enable-i2c.sh` を参照。

### I2C Scan 実機検証（#116）

検証用 slave は **ADT7410**（expected `0x48`）。配線の正本は [i2c-scan.md](../examples/i2c-scan.md)。センサ機能 Example は対象外。

| 項目 | 結果 |
| --- | --- |
| device | ADT7410。A0 / A1 = GND → address `0x48` |
| I2C1 pins | Pi 3 / 4 / 5 で物理 pin 3 = SDA（BCM 2）、pin 5 = SCL（BCM 3）。モデルごとに配線を変えない |
| host `/dev/i2c-1` | Pi 3 B+（#97）/ Pi 4（#98）/ Pi 5（#99）で確認済み。初期状態で無い場合は `setups/enable-i2c.sh` |
| Runtime scan | Pi 5（#99、Raspbian OS 64-bit / `aarch64` / `6.18.34+rpt-rpi-2712`）で `requestI2CAccess` + port `1` scan 成功。slave 未接続時は空配列 |
| Browser Scan | `:4173/i2c-scan/`。probe は Runtime `scanI2cPort` と同じ `open` + `writeByte(0x00)`（範囲 `0x03`–`0x77`）。[#114](https://github.com/gurezo/chirimen-raspi-docker/issues/114) / [#115](https://github.com/gurezo/chirimen-raspi-docker/issues/115) |
| expected | 配線後 Scan で hex 一覧に `0x48`。空配列は本検証では失敗 |
| Browser E2E 列 | Compatibility の Protocol E2E は protocol E2E のまま。実ブラウザ Scan は本節 |

GPIO26（LED）/ GPIO5（スイッチ）とはピンが重ならない。

### I2C Host Setup → Docker Runtime 実機検証（#219）

[#215](https://github.com/gurezo/chirimen-raspi-docker/issues/215) の正式順（I2C → Docker → doctor → Runtime）を、Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で確認した。ホスト環境と Runtime 結果は [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) と同一機。スクリプト責務は [#216](https://github.com/gurezo/chirimen-raspi-docker/issues/216) / [#217](https://github.com/gurezo/chirimen-raspi-docker/issues/217) / [#218](https://github.com/gurezo/chirimen-raspi-docker/issues/218)。既存の「Raspberry Pi 5」（#99）は上書きしない。

| 項目 | 結果 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 5 Model B Rev 1.0 |
| OS | Raspbian OS 64-bit |
| Kernel version | `6.18.34+rpt-rpi-2712` |
| Architecture | `aarch64` |
| `/dev/i2c-1` | 有効化後に存在（`ls -l /dev/i2c-1`） |
| enable-i2c.sh | `sudo ./setups/enable-i2c.sh` → reboot。`--check` は sudo 不要で `[ok] /dev/i2c-1 exists`（#216） |
| doctor.sh | All checks passed。`[ok] I2C: available (/dev/i2c-1)`。`[ capabilities ] gpio=sysfs i2c=i2c-dev`。設定は変更しない（#217） |
| Docker startup | 既存導入済み。`./setups/docker.sh` は I2C 設定を変更しない（#218）。Compose は導入済み |
| Runtime health | `./scripts/start.sh` の mapping は `i2c-1=yes`。`curl http://localhost:33330/health` は `{"name":"chirimen-raspi-docker-server","status":"ok","version":"0.0.1"}` |
| I2C Runtime | `docker compose exec chirimen-server ls -l /dev/i2c-1` で device あり。`requestI2CAccess` + port `1` scan 成功（#99） |
| Browser Scan | ADT7410 / `0x48` は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) |
| known limitations | 初期状態で `/dev/i2c-1` が無い場合あり。Docker 済みでは `docker.sh` は idempotent。`Supported` とは書かない |

### Browser Development Flow 実機検証（#243）

[#237](https://github.com/gurezo/chirimen-raspi-docker/issues/237) の `Learn → Edit → Save → Run → Verify` を、Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）を一次環境として記録する。ホスト環境と Runtime / GPIO / I2C / WebSocket 結果は [#99](https://github.com/gurezo/chirimen-raspi-docker/issues/99) / [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) / [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219) と同一機。Editor / Workspace / Example Server は [#241](https://github.com/gurezo/chirimen-raspi-docker/issues/241) の `workspace/` bind mount であり、GPIO / I2C device は渡さない。Catalog と Runtime Example の役割分離は [#238](https://github.com/gurezo/chirimen-raspi-docker/issues/238) / [#263](https://github.com/gurezo/chirimen-raspi-docker/issues/263)。既存の「Raspberry Pi 5」（#99）は上書きしない。手順の正本は [browser-development.md](../guides/browser-development.md#実機-e2e-検証243)。

| 項目 | 結果 |
| --- | --- |
| Raspberry Pi model | Raspberry Pi 5 Model B Rev 1.0（一次環境） |
| OS | Raspbian OS 64-bit |
| Kernel | `6.18.34+rpt-rpi-2712` |
| Architecture | `aarch64` |
| Docker version | 既存導入済み（#219） |
| Editor startup | Compose `chirimen-editor`（#175 / #208）。`curl -fsS http://127.0.0.1:8080/healthz` は HTTP 200 ならプロセス生存 |
| Workspace save | Editor `/home/coder/project` = host `./workspace`（#176 / #241）。container 内だけには保存されない |
| Example Server reflection | 同一 bind を `chirimen-examples` が `:4173` で配信（#179 / #241）。hot reload は無い。reload で反映 |
| Runtime health | `./scripts/start.sh` のあと `curl http://localhost:33330/health` は `{"name":"chirimen-raspi-docker-server","status":"ok","version":"0.0.1"}`（#219） |
| WebSocket connection | Protocol E2E Verified（#99）。HTML Example は `ws://localhost:33330/` |
| GPIO result | sysfs / Verified。port `26` の export / write（#99）。回路は BCM 26 / 物理 pin 37（[gpio-led-blink.md](../examples/gpio-led-blink.md)） |
| I2C result | i2c-dev / Verified。Browser Scan は ADT7410 / `0x48`（#116） |
| Catalog result | `:4200` は Example Catalog（Web UI 入口）。`workspace/` の編集は反映されない（#238 / #263）。I2C Scan は `:4173/i2c-scan/`（#116） |
| container 再起動後の保持 | `docker compose down`（`-v` なし）後も host `./workspace` は残る。named volume の password / 任意 Extension も残る |
| known limitations | 一次環境は Pi 5。Pi 3 B+ / 4 の Editor 個別再測定は未実施（Runtime / GPIO / I2C は #97 / #98）。`./scripts/start.sh --32bit` は Runtime only。`Supported` とは書かない |

### Example Catalog / Runtime Example 実機検証（#257）

Catalog `:4200` と Runtime Example `:4173` の機別記録は [runtime-verification.md](../examples/runtime-verification.md)。既存の「Raspberry Pi 3 B+」（#97）/「Raspberry Pi 4」（#98）/「Raspberry Pi 5」（#99）は上書きしない。`Supported` とは書かない。

| 項目 | 結果 |
| --- | --- |
| 対象 | `gpio-blink` / `gpio-button` / `i2c-detect` / `gpio-pir-sensor` / `i2c-sht30` / `i2c-adt7410` / `i2c-ads1115` |
| `gpio-blink` / `gpio-button` / `i2c-detect` | Pi 3 B+ / 4 / 5 で `verified`（#97 / #98 / #99 / #116 / #243） |
| Phase 2（PIR / SHT30 / ADT7410 / ADS1115） | 机上確認済み。Pi 3 / 4 / 5 とも `unverified`。推測で `verified` にしない |
| Catalog 表示 | 未確認モデルに `verified` チップを出さない。全体バッジ `verified` は 3 / 4 / 5 がすべて `verified` のときだけ |

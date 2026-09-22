# Host setup script 棚卸し

既存 Host setup / CHIRIMEN Setup script の責務と依存関係を整理し、親 Issue [#326](https://github.com/gurezo/chirimen-raspi-docker/issues/326) で追加する `setups/setup.sh` からの呼び出し可否を決める監査結果である。

関連:

- 親 Issue: [#326 初心者向け setup.sh を追加し CHIRIMEN 初期セットアップと Documentation の導線を一本化する](https://github.com/gurezo/chirimen-raspi-docker/issues/326)
- 子 Issue: [#327 既存 Host setup script の責務と setup.sh からの呼び出し可否を棚卸しする](https://github.com/gurezo/chirimen-raspi-docker/issues/327)
- 現行 Host 手順の正本: [Raspberry Pi Setup](./raspberry-pi-setup.md)
- 現行入口: [Getting Started](./getting-started.md)
- [`setups/README.md`](../../setups/README.md) / [`scripts/README.md`](../../scripts/README.md)

このドキュメントは **分類の正本** である。`setups/setup.sh` 本体の実装、Getting Started の書き換え、標準実行順の改訂は後続 Issue の担当である。

## 分類定義

| 分類 | 意味 |
| --- | --- |
| Runtime required | `setup.sh` から利用候補 |
| Conditional | 必要な場合のみ利用 |
| Development only | `setup.sh` から呼ばない |
| Deprecated / duplicate | 別途整理 |

## 再利用方針（重複回避）

- 既存 `.sh` の中身を `setup.sh` にコピーしない
- オーケストレータは「状態確認 → 既存 script を実行 / スキップ」のみ行う
- Host を変える処理は `setups/`、診断・起動は `scripts/` の境界を維持する
- Node.js / npm / pnpm / Nx を Host に要求しない（親 #326）
- Docker build と `swap.sh` は `setup.sh` から実行しない（親 #326）

## 呼び出し可否の結論

親 #326 の方針を正とする。現行 [Raspberry Pi Setup](./raspberry-pi-setup.md) / [`setups/README.md`](../../setups/README.md) は標準順で `swap.sh` を最初に実行する記述があるが、**初心者向け `setup.sh` では呼ばない**（差分の docs 整合は後続 Issue）。

| Script / 対象 | 分類 | `setup.sh` からの扱い |
| --- | --- | --- |
| [`setups/enable-i2c.sh`](../../setups/enable-i2c.sh) | Runtime required / Conditional（未 enable 時のみ） | 呼び出す。`/dev/i2c-1` が無ければ enable 後に reboot 案内で一旦終了し、再開後に `--check` |
| [`setups/docker.sh`](../../setups/docker.sh) | Runtime required | 呼び出す。末尾が必ず reboot するため、再開ポイントを設計する |
| [`setups/docker-compose.sh`](../../setups/docker-compose.sh) | Conditional（Deprecated / duplicate 候補あり） | `docker compose version` が使えるならスキップ。無いときだけ呼び出す |
| [`setups/disable-squeekboard.sh`](../../setups/disable-squeekboard.sh) | Conditional | Desktop 向け。Lite では no-op のため呼び出し可 |
| [`setups/swap.sh`](../../setups/swap.sh) | Development only | **呼ばない** |
| [`scripts/doctor.sh`](../../scripts/doctor.sh) | Runtime required（検証） | Host 設定は変えない。readiness check として `setup.sh` から呼び出し済み（#330） |
| [`scripts/start.sh`](../../scripts/start.sh) | Runtime required（起動） | Host `setup.sh` の範囲外。完了案内で `docker compose up -d` と `http://localhost:4200` を示す側 |
| [`scripts/build-docs-site.mjs`](../../scripts/build-docs-site.mjs) / [`scripts/build-server.mjs`](../../scripts/build-server.mjs) | Development only | 呼ばない |
| `workspace/` 準備 | Runtime required（検証） | 専用 Host script は無い。`setup.sh` が存在・書き込み可否を確認（#330） |
| GPIO permission / device | docs 手確認 + `doctor.sh` probe | 専用 `setups/` script は無い。`doctor.sh` の probe を再利用する |

```text
setup.sh（#328 / #329 / #330）
  → enable-i2c.sh（必要時）→ [reboot] → --check
  → disable-squeekboard.sh（任意・Lite は no-op）
  → docker.sh → [reboot]
  → docker-compose.sh（plugin が無ければ）
  → workspace/（存在・書き込み可否）
  → doctor.sh（Runtime readiness）
  → 案内: docker compose up -d / localhost:4200
  ✗ swap.sh
  ✗ Docker build
  ✗ start.sh（範囲外）
  ✗ build-*.mjs
```

## setups/（Raspberry Pi Setup / Host）

### `swap.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | `/swapfile`（既定 8G）の作成・有効化・`/etc/fstab` 追記。`--check` は確認のみ |
| 依存 | root（sudo）。`fallocate` / `dd` / `mkswap` / `swapon`。他の repo script は呼ばない |
| reboot | 不要（即時有効） |
| 分類 | **Development only** |
| 備考 | 主用途は Pi 4 / Pi 5 の Source Development / Docker build の OOM 緩和。Pi 3 B+ Runtime-only の必須ではない。親 #326 により `setup.sh` からは呼ばない |

### `enable-i2c.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | Host I2C を有効化し Runtime / Example が `/dev/i2c-1` を使えるようにする。`--check` は確認のみ |
| 依存 | enable 時は root。`raspi-config nonint do_i2c` または boot `config.txt` の `dtparam=i2c_arm=on` |
| reboot | `/dev/i2c-1` が無いときに必要（script 自身は reboot しない） |
| 分類 | **Runtime required** / **Conditional**（既に device があれば no-op） |

### `disable-squeekboard.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | Desktop のオンスクリーンキーボード（Squeekboard）を Always Off にする |
| 依存 | disable 時は root。`raspi-config` の `do_squeekboard`。Lite / 非 Desktop では変更せず終了 |
| reboot | 通常不要（残る場合は再ログインまたは reboot） |
| 分類 | **Conditional** |

### `docker.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | Docker Engine を Host にインストールする |
| 依存 | sudo、network（`get.docker.com`）、apt。グループ追加先はユーザー `pi` 固定（非 `pi` は reboot 後に `usermod` が必要） |
| reboot | **常に実行**（script 末尾の `sudo reboot`） |
| 分類 | **Runtime required** |
| 備考 | I2C は触らない。idempotent ではない（毎回 upgrade + reboot） |

### `docker-compose.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | standalone `docker-compose` を `/usr/local/bin/docker-compose` に置く |
| 依存 | sudo、network（linuxserver の wrapper）。`docker.sh` reboot 後に実行する想定 |
| reboot | 不要 |
| 分類 | **Conditional**（**Deprecated / duplicate 候補**） |
| 備考 | `doctor.sh` / `start.sh` は `docker compose` プラグインを優先する。get.docker.com 後はプラグインがあることが多い。実装 Issue では plugin 確認を先に行い、足りないときだけ本 script を呼ぶ |

## scripts/（CHIRIMEN Setup + 開発補助）

### `doctor.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | Host Setup 後の読み取り専用 preflight（Pi / OS / arch、memory/swap、Docker、Compose、GPIO / I2C capability） |
| 依存 | sudo 不要。Docker CLI があれば利用。Host 設定は変えない |
| reboot | なし（I2C 不足時に reboot を案内しうる） |
| 分類 | **Runtime required（検証）** |
| 備考 | `setup.sh` 本体の Host 変更フェーズには含めず、完了後の readiness check として `setup.sh` から呼び出し済み（#330）。`CHIRIMEN_BEGINNER_SETUP=1` 時は次手順を `setup.sh` 案内に委ねる |

### `start.sh`

| 項目 | 内容 |
| --- | --- |
| 責務 | capability に応じた Compose 起動。存在する GPIO / I2C device だけを渡す。既定は build 相当、Pi 3 B+ は `--no-build` |
| 依存 | Docker Compose プラグイン、`compose.yaml` |
| reboot | なし |
| 分類 | **Runtime required（起動）** / Host `setup.sh` の範囲外 |
| 備考 | 親 #326 の最終 UX は `docker compose up -d` → `localhost:4200`。`setup.sh` は起動そのものではなく案内まで |

### `build-docs-site.mjs` / `build-server.mjs`

| 項目 | 内容 |
| --- | --- |
| 責務 | 公開 docs サイト生成 / 32-bit 向け server bundle |
| 分類 | **Development only** |
| 備考 | Host 構築でも Runtime 起動でもない |

## 専用 script が無い領域

| 領域 | 現状 | `setup.sh` への示唆 |
| --- | --- | --- |
| `workspace/` | [`workspace/README.md`](../../workspace/README.md)。Compose の bind-mount。Host 用 setup script は無い | `setup.sh` が存在・書き込み可否を確認済み（#330）。新規に同等処理を二重実装しない |
| GPIO permission / device | [Raspberry Pi Setup の GPIO 節](./raspberry-pi-setup.md#gpio) が手確認。`doctor.sh` が probe | 新規 `setups/` script を増やさず `doctor.sh` を再利用 |
| permission / device check 全般 | `doctor.sh` と docs | オーケストレータは診断結果の解釈に留め、設定変更は既存 `setups/` に委譲 |

## 現行 docs との差分（後続で整合）

| 現行（標準順） | 本監査（`setup.sh`） |
| --- | --- |
| 1. `swap.sh` を実行してよい | **呼ばない**（Development only） |
| 2–5. I2C → squeekboard → docker → compose | 呼び出す（compose は Conditional） |
| 完了後に `doctor.sh` → `start.sh` | doctor は `setup.sh` から readiness として呼び出し済み（#330）。start は範囲外で `docker compose up -d` 案内へ寄せる（後続 docs Issue） |

Getting Started / raspberry-pi-setup / setups README の初心者導線書き換えは、親 #326 の後続子 Issue（Getting Started / Documentation alignment）で行う。

## 完了条件チェック（#327）

- [x] 既存 setup script を棚卸しした
- [x] Runtime / Development を分類した
- [x] `setup.sh` から利用する処理を決定した
- [x] 重複実装を避ける方針を明記した
- [x] `swap.sh` = Development only を確認した

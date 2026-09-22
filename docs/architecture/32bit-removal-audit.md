# Raspberry Pi OS 32-bit Removal Audit

親 Issue [#337](https://github.com/gurezo/chirimen-raspi-docker/issues/337) で Raspberry Pi OS 32-bit をサポート対象外とし Runtime を 64-bit に一本化するにあたり、削除前に Repository-wide で 32-bit 関連箇所を棚卸しした監査結果である。

関連:

- 親 Issue: [#337 Raspberry Pi OS 32-bit をサポート対象外とし Runtime を 64-bit に一本化する](https://github.com/gurezo/chirimen-raspi-docker/issues/337)
- 子 Issue: [#338 32-bit 専用コード・設定・Documentation を Repository-wide audit する](https://github.com/gurezo/chirimen-raspi-docker/issues/338)
- 後続: [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) Dockerfile.32bit 削除 / [#340](https://github.com/gurezo/chirimen-raspi-docker/issues/340) start.sh `--32bit` 削除 / [#341](https://github.com/gurezo/chirimen-raspi-docker/issues/341) build-server.mjs / [#342](https://github.com/gurezo/chirimen-raspi-docker/issues/342) compose / [#343](https://github.com/gurezo/chirimen-raspi-docker/issues/343) doctor/setup Unsupported / [#344](https://github.com/gurezo/chirimen-raspi-docker/issues/344) Historical Documentation / [#345](https://github.com/gurezo/chirimen-raspi-docker/issues/345) Support Policy docs / [#346](https://github.com/gurezo/chirimen-raspi-docker/issues/346) 64-bit 回帰
- 現行 32-bit 記録: [32-bit Compatibility (Historical / Unsupported)](./compatibility-32bit.md)
- 監査パターン先例: [Host setup script 棚卸し](../guides/setup-host-script-audit.md)

このドキュメントは **分類の正本** である。本 Issue（#338）ではコード削除・起動分岐除去・Support Policy 文言の本格書き換えは行わない。実装は後続子 Issue が担当する。

## 検索キーワード

`32bit`, `32-bit`, `armv7`, `arm/v7`, `linux/arm/v7`, `OS_BITS`, `DOCKERFILE_32BIT`, `IMAGE_32BIT`, `--32bit`, `Dockerfile.32bit`, `build-server`, `phase1-32bit`

除外: `node_modules/`, `.git/`, `_site/`, `dist/`, `out-tsc/`, `.nx/`, `pnpm-lock.yaml`

## 分類定義

| 分類 | 意味 | 後続 Issue の目安 |
| --- | --- | --- |
| delete | 32-bit 専用コード / 起動分岐 / Docker path | #339–#342 |
| update | 現行 docs / 警告文言の書き換え（Unsupported 化など） | #343, #345 |
| preserve → Historical | 検証結果・技術背景・workaround の経緯 | #344 |
| out of scope | 無関係な ARM / arm64 / 一般 Docker / Pi 3 B+ 64-bit Runtime | 触らない |

## 設計原則

```text
32-bit support code
        ↓
      削除（後続 Issue）

32-bit で得た知識
        ↓
      保存（#344 Historical）
```

## Docker / scripts / compose（実装・設定）

検索時点の実装・設定ヒット。`package.json` / Nx targets / GitHub Actions / `setups/` からは `Dockerfile.32bit`・`--32bit`・`build-server` の参照は見つからなかった。

| ファイル / 対象 | 該当箇所（概要） | 分類 | 担当 | メモ |
| --- | --- | --- | --- | --- |
| `docker/server/Dockerfile.32bit`（削除済み） | ファイル全体。`node:22-bookworm-slim`、`RUN node scripts/build-server.mjs`、arm/v7 / Nx hasher コメント | delete（完了） | #339 | 削除済み。導入理由は [compatibility-32bit.md](./compatibility-32bit.md) に Historical として保存 |
| [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | 先頭コメント（旧 `Dockerfile.32bit` / armv7 誘導） | update（完了） | #339 | 64-bit 唯一の supported path。コメント整理済み |
| [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) | `arm32` / `armv7` is out of scope コメント | out of scope（文言は update 可） | #345 任意 | Editor が armv7 非対応である事実のメモ。削除対象のコードパスではない |
| [`compose.yaml`](../../compose.yaml) | `chirimen-server` build コメント（旧 `--32bit` → 旧 `Dockerfile.32bit`）；Examples/Catalog の旧 `--32bit` Runtime-only コメント | update（完了） | #342 | コメント整理済み。override 用 env は無く、supported Runtime path は 64-bit のみ |
| [`scripts/start.sh`](../../scripts/start.sh)（削除済み分岐） | 旧 `DOCKERFILE_32BIT` / `IMAGE_32BIT` / `OS_BITS` / `set_os_bits` / `dockerfile_for_os_bits` / `image_for_os_bits` / `reject_32bit_machine_without_flag` / `--32bit` 引数 / 32-bit 時の Editor・Examples・Catalog skip / help・usage | delete（完了） | #340 | 64-bit 単一路線に簡素化済み。`--32bit` は removed flag error。`--no-build` / `--lan` は維持 |
| `scripts/build-server.mjs`（削除済み） | esbuild で `apps/server` を bundle。呼び出し元だった `Dockerfile.32bit` は削除済み（`package.json` 未登録） | delete（完了） | #341 | 削除済み。32-bit workaround 専用で他用途なし。esbuild 導入理由は [compatibility-32bit.md](./compatibility-32bit.md) に Historical として保存 |
| [`scripts/doctor.sh`](../../scripts/doctor.sh) | 旧 `armv7l` 等で `[warn] 32-bit OS/architecture`；`aarch64 \| armv7l` を期待 arch として列挙 | update（完了） | #343 | `getconf LONG_BIT` 主判定 + `uname -m` 補助。Unsupported で即 exit 1。期待 arch は `aarch64`。Compatibility 導線付き |
| [`scripts/README.md`](../../scripts/README.md) | 旧 `build-server.mjs` 行 | update（完了） | #341 | スクリプト削除に合わせて行を除去済み |
| [`setups/setup.sh`](../../setups/setup.sh) | 旧: 32-bit 検出なし | update（完了） | #343 | `require_environment` で同等の早期 Unsupported ガードを追加済み |
| `package.json` / Nx / CI | `build-server` / `Dockerfile.32bit` / `--32bit` 参照なし | out of scope | — | 追加の削除対象なし |

## Documentation / README / site

| ファイル / 対象 | 該当箇所（概要） | 分類 | 担当 | メモ |
| --- | --- | --- | --- | --- |
| [`docs/architecture/docker.md`](./docker.md) | `Dockerfile.32bit` 残置方針、Runtime only 行、Architecture / stage 表、`--32bit` 説明、旧 `build-server.mjs` | update（#339/#340/#341 一部反映済み） | #345（残り） | 「削除はしない」と生きた `--32bit` 手順は撤廃済み。`build-server.mjs` は削除済み表記。Support Policy 文言は #345 |
| [`docs/architecture/overview.md`](./overview.md) | 非推奨リンク、ツリー上の旧 `Dockerfile.32bit` / `build-server.mjs`、`--32bit` Runtime only | update（#339/#340/#341 一部反映済み） | #345 | ツリーから `Dockerfile.32bit` / `build-server.mjs` 行除去済み。生きた `--32bit` 言及も除去済み |
| [`docs/architecture/compatibility-32bit.md`](./compatibility-32bit.md) | ページ全体（Status / 制約 / Pi 3 B+・4・5 検証 / Known limitations） | preserve → Historical | #344 | **完了**: Historical / Unsupported として再構成。Test Matrix・support 終了理由・arch 知見を保持 |

| [`docs/architecture/compatibility.md`](./compatibility.md) | 32-bit リンク、非推奨 callout、各モデル known limitations、Editor の `--32bit` 言及 | update + preserve リンク | #345 / #344 | 「非推奨」→ Unsupported。検証へのポインタは Historical へ残す |
| [`docs/architecture/browser-editor.md`](./browser-editor.md) | arm32/armv7 非対応表、`--32bit` / LAN、履歴上の `--32bit` | update + 一部 preserve | #345 / #344 | Editor 非対応の技術事実は残してよい。起動手順から `--32bit` を外す |
| [`docs/guides/getting-started.md`](../guides/getting-started.md) | 32-bit 非推奨 callout | update | #345 | 初心者導線から 32-bit 手順・非推奨表現を除去し Unsupported + Historical 参照へ |
| [`docs/guides/troubleshooting.md`](../guides/troubleshooting.md) | 「32-bit OS は非推奨」節、`--32bit` と `--lan`、4173/4200 の `--32bit` 原因記述 | update | #345 | 移行案内は残しつつ `--32bit` 手順前提を削除 |
| [`docs/guides/development.md`](../guides/development.md) | 32-bit 非推奨 callout | update | #345 | |
| [`docs/guides/raspberry-pi-setup.md`](../guides/raspberry-pi-setup.md) | 32-bit 非推奨 callout | update | #345 | |
| [`docs/guides/browser-development.md`](../guides/browser-development.md) | 非推奨 callout、32-bit は通常フローではない記述 | update | #345 | |
| [`docs/guides/setup-host-script-audit.md`](../guides/setup-host-script-audit.md) | 旧 `build-server.mjs` 記載 | update（完了） | #341 | スクリプト削除に合わせて除去済み |
| [`docs/examples/runtime-verification.md`](../examples/runtime-verification.md) | 32-bit は対象外 + compatibility-32bit リンク | update | #345 | リンク先を Historical 表記に合わせる |
| [`docs/site/index.html`](../site/index.html) | 「32-bit OS は非推奨」+ compatibility-32bit リンク | update | #345 | サイト生成元と同期 |
| [`README.md`](../../README.md) | 32-bit 非推奨 callout | update | #345 | |

## Historical に残す情報（チェックリスト）

正本: [`docs/architecture/compatibility-32bit.md`](./compatibility-32bit.md)（Historical / Unsupported）。#344 で Status: Historical / Unsupported を明示し、Getting Started と誤認しない導線にした。

- [x] Pi 3 B+ / Pi 4 / Pi 5 の当時の Test Matrix（OS / kernel / architecture / GPIO / I2C / WebSocket / cleanup）
- [x] Pi 3 B+ 32-bit は `armv7l`、Pi 4 / Pi 5 32-bit OS は 32-bit userland でも `uname -m` が `aarch64`（64-bit kernel default）
- [x] `uname -m` だけでは userland bitness 判定が不十分だった事例
- [x] Node 24 公式 image に `linux/arm/v7` が無い制約と、検証時 Node 22 / `Dockerfile.32bit` の選択理由
- [x] Nx native bindings / WASM fallback が arm/v7 で失敗した経緯
- [x] `scripts/build-server.mjs`（esbuild）workaround の導入理由
- [x] `--32bit` が Runtime only（Editor / Examples / Catalog skip）だった運用上の制約
- [x] GPIO / I2C / WebSocket / browser-polyfill / server の実機検証結果（Verified でも Supported ではない。browser-polyfill / Editor は当時対象外と明記）
- [x] support 終了理由（64-bit Desktop 標準化、単一 Runtime path、保守コスト）
- [x] 関連 Issue / PR ポインタ（少なくとも #135, #167, #228, 親 #337、子 #344）
## 誤削除防止（out of scope）

次は 32-bit 専用サポートコードではない。親 #337 の方針どおり **触らない / 誤って削除しない**。

| 対象 | 理由 |
| --- | --- |
| Pi 3 B+ の **64-bit** Runtime Supported（Runtime-only / Docker build Unsupported） | モデル自体はサポート維持。32-bit OS だけ Unsupported |
| `linux/arm64` / `aarch64` 上の 64-bit Runtime・Editor・Catalog | 標準サポート path |
| [`docker/server/Dockerfile`](../../docker/server/Dockerfile) 本体（Node 24 multi-stage） | 64-bit 唯一の supported Dockerfile。コメント整理のみ |
| [`compose.yaml`](../../compose.yaml) のサービス定義・port・volume | コメントの 32-bit 言及は #342 で除去済み。定義本体は現行 Runtime |
| `./scripts/start.sh` の `--no-build` / `--lan` / password / device mapping など 64-bit 向け機能 | bitness 分岐だけ削除 |
| `doctor.sh` の GPIO / I2C / Docker / memory 等の readiness 検査 | 32-bit は Unsupported 停止（#343 完了）。それ以外の readiness は維持 |
| Editor が `arm32` / `armv7` 非対応である技術記述 | 事実として docs に残してよい（起動 flag とは別） |
| GHCR / 将来 prebuilt の **arm64** 配布方針 | 親 Issue と整合。arm/v7 配布は対象外 |

## 後続 Issue への引き継ぎ

```text
#338 audit（本ドキュメント・削除しない）
  → #344 Historical 退避・再構成（完了）
  → #339 Dockerfile.32bit / arm/v7 build 削除（完了）
  → #340 start.sh --32bit / OS_BITS 分岐削除（完了）
  → #341 build-server.mjs 参照確認・削除（完了）
  → #342 compose.yaml コメント / 64-bit 一本化（完了）
  → #343 doctor.sh / setup.sh Unsupported 検出（完了）
  → #345 README / Getting Started / Compatibility 等 Support Policy
  → #346 Pi 3 B+ / 4 / 5 64-bit 回帰テスト
```

| Issue | 担当範囲（本監査からの導線） |
| --- | --- |
| #339 | **完了**: `Dockerfile.32bit` 削除、64-bit `Dockerfile` の 32-bit コメント整理、arm/v7 / Node 22 依存の除去。背景は `compatibility-32bit.md` に保存 |
| #340 | **完了**: `start.sh` の `--32bit` / `OS_BITS*` / `*_for_os_bits` / `reject_32bit_*` / 32-bit service skip / help を削除し 64-bit path を簡素化。生きた `--32bit` 手順言及を architecture docs から除去 |
| #341 | **完了**: `build-server.mjs` の全参照確認のうえ削除（32-bit 専用・他用途なし）。esbuild 導入理由は `compatibility-32bit.md` に保存 |
| #342 | **完了**: `compose.yaml` の 32-bit コメント削除。beginner が bitness を選ばない単一 path。override / profile / arm/v7 build option は元々無し |
| #343 | **完了**: `doctor.sh` / `setup.sh` で 32-bit userland を `getconf LONG_BIT` 主判定（`uname -m` 補助）し Unsupported で即停止。Compatibility / compatibility-32bit 導線 |
| #344 | **完了**: `compatibility-32bit.md` を Historical / Unsupported に再構成。上記チェックリストを保持 |
| #345 | 「非推奨」→「Unsupported」。64-bit Desktop 標準。Pi 3 B+ 64-bit Runtime 維持。Current / Historical を区別 |
| #346 | 削除後の Pi 3 B+ / 4 / 5 64-bit 回帰（Runtime / 必要なら Development、GPIO / I2C、Catalog） |

## 完了条件（#338）

- [x] 32-bit 関連箇所一覧を作成
- [x] 削除 / 更新 / 保存に分類
- [x] Historical Documentation に残す情報を特定
- [x] 32-bit と無関係な ARM 対応を誤って削除しない旨を明記

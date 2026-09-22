# Raspberry Pi OS 32-bit Removal Audit

親 Issue [#337](https://github.com/gurezo/chirimen-raspi-docker/issues/337) で Raspberry Pi OS 32-bit をサポート対象外とし Runtime を 64-bit に一本化するにあたり、削除前に Repository-wide で 32-bit 関連箇所を棚卸しした監査結果である。

関連:

- 親 Issue: [#337 Raspberry Pi OS 32-bit をサポート対象外とし Runtime を 64-bit に一本化する](https://github.com/gurezo/chirimen-raspi-docker/issues/337)
- 子 Issue: [#338 32-bit 専用コード・設定・Documentation を Repository-wide audit する](https://github.com/gurezo/chirimen-raspi-docker/issues/338)
- 後続: [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) Dockerfile.32bit 削除 / [#340](https://github.com/gurezo/chirimen-raspi-docker/issues/340) start.sh `--32bit` 削除 / [#341](https://github.com/gurezo/chirimen-raspi-docker/issues/341) build-server.mjs / [#342](https://github.com/gurezo/chirimen-raspi-docker/issues/342) compose / [#343](https://github.com/gurezo/chirimen-raspi-docker/issues/343) doctor/setup Unsupported / [#344](https://github.com/gurezo/chirimen-raspi-docker/issues/344) Historical Documentation / [#345](https://github.com/gurezo/chirimen-raspi-docker/issues/345) Support Policy docs / [#346](https://github.com/gurezo/chirimen-raspi-docker/issues/346) 64-bit 回帰
- 現行 32-bit 記録: [32-bit Compatibility](./compatibility-32bit.md)
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
| [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit) | ファイル全体。`node:22-bookworm-slim`、`RUN node scripts/build-server.mjs`、arm/v7 / Nx hasher コメント | delete | #339 | 32-bit 専用 path。導入理由（Node 24 に `linux/arm/v7` 無し、Nx native / WASM）は #344 へ |
| [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | 先頭コメント（`Dockerfile.32bit` / armv7 / esbuild 同期注意） | update | #339 | 64-bit 本体は残す。32-bit 言及コメントのみ整理 |
| [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) | `arm32` / `armv7` is out of scope コメント | out of scope（文言は update 可） | #345 任意 | Editor が armv7 非対応である事実のメモ。削除対象のコードパスではない |
| [`compose.yaml`](../../compose.yaml) | `chirimen-server` build コメント（`--32bit` → `Dockerfile.32bit`）；Examples/Catalog の `--32bit` Runtime-only コメント | update | #342 | override 用 env は無くコメントのみ。64-bit 一本化時に削除・書き換え |
| [`scripts/start.sh`](../../scripts/start.sh) | `DOCKERFILE_32BIT` / `IMAGE_32BIT` / `OS_BITS` / `set_os_bits` / `dockerfile_for_os_bits` / `image_for_os_bits` / `reject_32bit_machine_without_flag` / `--32bit` 引数 / 32-bit 時の Editor・Examples・Catalog skip / help・usage | delete | #340 | 32-bit 専用分岐の中心。`--no-build` / `--lan` / 64-bit 既定起動は維持 |
| [`scripts/build-server.mjs`](../../scripts/build-server.mjs) | esbuild で `apps/server` を bundle。呼び出し元は `Dockerfile.32bit` のみ（`package.json` 未登録） | delete（#341 で最終確認） | #341 | 現状は 32-bit workaround 専用。他用途が無ければ削除。esbuild 導入理由は #344 |
| [`scripts/doctor.sh`](../../scripts/doctor.sh) | `armv7l` 等で `[warn] 32-bit OS/architecture`；`aarch64 \| armv7l` を期待 arch として列挙 | update | #343 | warn 継続ではなく Unsupported で停止・案内へ。`uname -m` のみ判定は不十分（Pi 4/5 32-bit userland は `aarch64`） |
| [`scripts/README.md`](../../scripts/README.md) | `build-server.mjs` を「32-bit Docker 用」と記載 | update | #341 / #345 | スクリプト削除結果に合わせて更新 |
| [`setups/setup.sh`](../../setups/setup.sh) | 32-bit 検出なし | update（新規検出） | #343 | 現状未検出。32-bit userland を Unsupported として案内する実装を追加 |
| `package.json` / Nx / CI | `build-server` / `Dockerfile.32bit` / `--32bit` 参照なし | out of scope | — | 追加の削除対象なし |

## Documentation / README / site

| ファイル / 対象 | 該当箇所（概要） | 分類 | 担当 | メモ |
| --- | --- | --- | --- | --- |
| [`docs/architecture/compatibility-32bit.md`](./compatibility-32bit.md) | ページ全体（Status / 制約 / Pi 3 B+・4・5 検証 / Known limitations） | preserve → Historical | #344 | 削除しない。Historical / Unsupported へ再構成。現行「非推奨」「削除はしない」表現も #344 で整理 |
| [`docs/architecture/compatibility.md`](./compatibility.md) | 32-bit リンク、非推奨 callout、各モデル known limitations、Editor の `--32bit` 言及 | update + preserve リンク | #345 / #344 | 「非推奨」→ Unsupported。検証へのポインタは Historical へ残す |
| [`docs/architecture/docker.md`](./docker.md) | `Dockerfile.32bit` 残置方針、Runtime only 行、Architecture / stage 表、`--32bit` 説明、`build-server.mjs` | update | #345（#339/#342 反映後） | 「削除はしない」を撤廃し 64-bit 単一 path に合わせる |
| [`docs/architecture/overview.md`](./overview.md) | 非推奨リンク、ツリー上の `Dockerfile.32bit` / `build-server.mjs`、`--32bit` Runtime only | update | #345 | ツリーと Setup 説明から 32-bit path を除去 |
| [`docs/architecture/browser-editor.md`](./browser-editor.md) | arm32/armv7 非対応表、`--32bit` / LAN、履歴上の `--32bit` | update + 一部 preserve | #345 / #344 | Editor 非対応の技術事実は残してよい。起動手順から `--32bit` を外す |
| [`docs/guides/getting-started.md`](../guides/getting-started.md) | 32-bit 非推奨 callout | update | #345 | 初心者導線から 32-bit 手順・非推奨表現を除去し Unsupported + Historical 参照へ |
| [`docs/guides/troubleshooting.md`](../guides/troubleshooting.md) | 「32-bit OS は非推奨」節、`--32bit` と `--lan`、4173/4200 の `--32bit` 原因記述 | update | #345 | 移行案内は残しつつ `--32bit` 手順前提を削除 |
| [`docs/guides/development.md`](../guides/development.md) | 32-bit 非推奨 callout | update | #345 | |
| [`docs/guides/raspberry-pi-setup.md`](../guides/raspberry-pi-setup.md) | 32-bit 非推奨 callout | update | #345 | |
| [`docs/guides/browser-development.md`](../guides/browser-development.md) | 非推奨 callout、32-bit は通常フローではない記述 | update | #345 | |
| [`docs/guides/setup-host-script-audit.md`](../guides/setup-host-script-audit.md) | `build-server.mjs` を 32-bit 向けと記載 | update | #341 / #345 | スクリプト整理結果に追随 |
| [`docs/examples/runtime-verification.md`](../examples/runtime-verification.md) | 32-bit は対象外 + compatibility-32bit リンク | update | #345 | リンク先を Historical 表記に合わせる |
| [`docs/site/index.html`](../site/index.html) | 「32-bit OS は非推奨」+ compatibility-32bit リンク | update | #345 | サイト生成元と同期 |
| [`README.md`](../../README.md) | 32-bit 非推奨 callout | update | #345 | |

## Historical に残す情報（チェックリスト）

現行正本候補: [`docs/architecture/compatibility-32bit.md`](./compatibility-32bit.md)。#344 で Status: Historical / Unsupported を明示し、Getting Started と誤認しない導線にする。

- [ ] Pi 3 B+ / Pi 4 / Pi 5 の当時の Test Matrix（OS / kernel / architecture / GPIO / I2C / WebSocket / cleanup）
- [ ] Pi 3 B+ 32-bit は `armv7l`、Pi 4 / Pi 5 32-bit OS は 32-bit userland でも `uname -m` が `aarch64`（64-bit kernel default）
- [ ] `uname -m` だけでは userland bitness 判定が不十分だった事例
- [ ] Node 24 公式 image に `linux/arm/v7` が無い制約と、検証時 Node 22 / `Dockerfile.32bit` の選択理由
- [ ] Nx native bindings / WASM fallback が arm/v7 で失敗した経緯
- [ ] `scripts/build-server.mjs`（esbuild）workaround の導入理由
- [ ] `--32bit` が Runtime only（Editor / Examples / Catalog skip）だった運用上の制約
- [ ] GPIO / I2C / WebSocket / browser-polyfill / server の実機検証結果（Verified でも Supported ではない）
- [ ] support 終了理由（64-bit Desktop 標準化、単一 Runtime path、保守コスト）
- [ ] 関連 Issue / PR ポインタ（少なくとも #135, #167, #228, 親 #337）
## 誤削除防止（out of scope）

- （#338 inventory で埋める）

## 後続 Issue への引き継ぎ

| Issue | 担当範囲（本監査からの導線） |
| --- | --- |
| #339 | Dockerfile.32bit / arm/v7 build path |
| #340 | start.sh `--32bit` / OS bitness 分岐 |
| #341 | build-server.mjs 参照確認・整理 |
| #342 | compose.yaml 64-bit 一本化 |
| #343 | doctor.sh / setup.sh Unsupported 検出 |
| #344 | Historical Documentation 再構成 |
| #345 | README / Getting Started / Compatibility Support Policy |
| #346 | Pi 3 B+ / 4 / 5 64-bit 回帰テスト |

## 完了条件（#338）

- [ ] 32-bit 関連箇所一覧を作成
- [ ] 削除 / 更新 / 保存に分類
- [ ] Historical Documentation に残す情報を特定
- [ ] 32-bit と無関係な ARM 対応を誤って削除しない旨を明記

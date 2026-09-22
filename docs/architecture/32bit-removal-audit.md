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

| ファイル / 対象 | 該当箇所（概要） | 分類 | 担当 | メモ |
| --- | --- | --- | --- | --- |
| （inventory 予定） | | | | |

## Documentation / README / site

| ファイル / 対象 | 該当箇所（概要） | 分類 | 担当 | メモ |
| --- | --- | --- | --- | --- |
| （inventory 予定） | | | | |

## Historical に残す情報（チェックリスト）

現行正本候補: [`docs/architecture/compatibility-32bit.md`](./compatibility-32bit.md)

- [ ] （#338 inventory で埋める）

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

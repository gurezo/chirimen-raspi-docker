# Example Catalog と Legacy CHIRIMEN 資産

Example Catalog と Legacy 資産の出典・責務・状態・技術構成を、利用者向けにまとめた正本です。

関連:

- 親 Issue: [#250 Legacy CHIRIMEN Examples を活用した Example Catalog と Runtime 向け Example を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/250)
- 子 Issue: [#258 Example Catalog と Legacy CHIRIMEN 資産の Documentation を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/258)
- 移植対象: [legacy-inventory.md](./legacy-inventory.md)（[#251](https://github.com/gurezo/chirimen-raspi-docker/issues/251)）
- Device join: [catalog-metadata.md](./catalog-metadata.md)（[#252](https://github.com/gurezo/chirimen-raspi-docker/issues/252)）
- 回路図: [schematic-compatibility.md](./schematic-compatibility.md)（[#253](https://github.com/gurezo/chirimen-raspi-docker/issues/253)）
- 実機検証: [runtime-verification.md](./runtime-verification.md)（[#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257)）
- Catalog UI: [`apps/example-catalog`](../../apps/example-catalog/)（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254) / [#255](https://github.com/gurezo/chirimen-raspi-docker/issues/255)）

この文書は **出典と責任範囲の案内** が目的である。metadata 設計、回路図ルール、実機記録、Catalog UI 実装は対象外。詳細は上の正本へ。

## 出典と責務

情報の正本は資産ごとに別リポジトリまたは別レイヤーである。本リポジトリで Device 情報や回路図 PNG を複製しない。

```text
Device metadata
  → chirimen-certified-devices（generated/devices.json）

Legacy Example / schematic
  → chirimen.org Legacy GC Examples

Runtime Example
  → chirimen-raspi-docker（workspace / runtimeExamplePath）

Device catalog
  → chirimen-device-dashboard
```

```text
chirimen-certified-devices
        │ Device metadata
        ↓
Legacy GC ─────→ Example Catalog :4174
Examples         HTML / Vanilla JS
│                Tailwind CSS はスタイルのみ
├─ schematic           │
└─ porting source      ↓
                 Runtime Example :4173
                       ↓
                 Browser Polyfill
                       ↓
                 chirimen-server :33330
                       ↓
                 Raspberry Pi 3/4/5

chirimen-device-dashboard
  └─ CHIRIMEN 全体の Device Catalog
     必要に応じて外部リンク
     iframe 埋め込みは行わない
```

| 責務 | 正本 | 本リポジトリの扱い |
| --- | --- | --- |
| Device metadata | [chirimen-certified-devices](https://github.com/gurezo/chirimen-certified-devices) の [`generated/devices.json`](https://github.com/gurezo/chirimen-certified-devices/blob/main/generated/devices.json) | Catalog が `deviceId` で参照する。`devices.json` はコピーしない |
| Legacy Example / 回路図 | [Legacy GC Examples](https://www.chirimen.org/chirimen/gc/top/examples/) | Example の `legacyUrl` / `schematicUrl`。PNG はコピーしない |
| Runtime Example | 本リポジトリの [workspace/](../../workspace/) | `runtimeExamplePath`。ported の実行コードだけが対象 |
| Device 一覧 UI | [chirimen-device-dashboard](https://github.com/gurezo/chirimen-device-dashboard) | Catalog ヘッダーの外部リンク。iframe しない |

Catalog は題材の発見入口である。Hardware Runtime ではない。GPIO / I2C 操作は Runtime Example → Browser Polyfill → `chirimen-server` `:33330` が行う。

### Device metadata

型番・画像・説明・ドライバは certified-devices の正本である。join キーは Example の `deviceId`。空の `deviceId` は正規ケースであり、Catalog は Example カードを落とさない。詳細は [catalog-metadata.md](./catalog-metadata.md)。

Catalog が取得する URL:

```text
https://raw.githubusercontent.com/gurezo/chirimen-certified-devices/main/generated/devices.json
```

### Legacy Example / schematic

題材と回路図の出典は Legacy GC である。Catalog / Documentation は `schematicUrl` をリンクとして残し、画像ファイルは `docs/` や `workspace/` に置かない。Device 側の `meta.circuit` は使わない。Pi 3 / 4 / 5 のピン互換は机上確認（`supportedRaspberryPi`）であり、回路図があるだけでは `verified` にしない。詳細は [schematic-compatibility.md](./schematic-compatibility.md)。

| 種別 | URL |
| --- | --- |
| Legacy Example 一覧 | https://www.chirimen.org/chirimen/gc/top/examples/ |
| Legacy ソース | https://github.com/chirimen-oh/chirimen/tree/master/gc |

### Runtime Example

実行コードの責任範囲は本リポジトリである。Legacy GC のスクリプトや certified-devices の upstream Example は動かさない。ported Example だけ `workspace/<name>/` に HTML / JS を持ち、Catalog の「実行」は Example Server `:4173`、「編集」は Editor `:8080` の既存 workspace ルートを開く。未移植（`legacy`）は回路図と Legacy リンクのみ。配置は [workspace/README.md](../../workspace/README.md)。

### Device Dashboard

CHIRIMEN 全体の Device 一覧は [chirimen-device-dashboard](https://github.com/gurezo/chirimen-device-dashboard) の責務である。Example Catalog は Raspberry Pi Runtime 向け Example の発見入口であり、Device Catalog を代替しない。iframe で埋め込まない。

## status の意味

親 Issue の Example 状態 `legacy` / `ported` / `verified` は、inventory に保存せず `portingStatus` と機種別実機結果から導出する。導出式は [legacy-inventory.md](./legacy-inventory.md) と同じである。

```text
legacy   = portingStatus が legacy
ported   = portingStatus が ported かつ verificationByModel の 3/4/5 がすべて verified ではない
verified = portingStatus が ported かつ verificationByModel の 3 かつ 4 かつ 5 が verified
```

| 表示 | 意味 |
| --- | --- |
| `legacy` | 本 Runtime へ未移植。回路図 / Legacy Example の案内のみ |
| `ported` | `workspace/` に実行コードがある。Pi 3 / 4 / 5 の実機が揃っていない、または 1 機種でも `failed` |
| `verified` | 移植済みかつ Raspberry Pi 3 **かつ** 4 **かつ** 5 で本 Runtime の実機確認が通った |

机上ピン互換（`supportedRaspberryPi`）と実機（`verificationByModel`）は別層である。

| 層 | metadata | 正本 |
| --- | --- | --- |
| ピン互換の机上確認 | `supportedRaspberryPi` | [schematic-compatibility.md](./schematic-compatibility.md) |
| 機種別の実機結果 | `verificationByModel` | [runtime-verification.md](./runtime-verification.md) |
| Catalog 全体バッジ | 上記から導出 | 本文書の導出式 |

机上合格だけでは `Verified` にしない。Legacy GC 側の動作実績だけでは `verified` にしない。1 機種でも `unverified` / `failed` なら全体バッジは `ported`。未確認環境を `Supported` とも書かない。

## Catalog 技術構成

実装は [`apps/example-catalog`](../../apps/example-catalog/)（Nx プロジェクト `example-catalog`、Vite）。HTML と Vanilla JavaScript（TypeScript の DOM 操作）を基本とする。Tailwind CSS はスタイル用途に限定する。Angular / React / Vue などの SPA framework は使わない。

| 項目 | 内容 |
| --- | --- |
| UI | HTML + Vanilla JavaScript。Tailwind CSS はスタイルのみ |
| 使わないもの | Angular / React / Vue などの SPA framework。Device Dashboard の iframe |
| 入口 | `http://127.0.0.1:4174/`（Compose `chirimen-example-catalog`） |
| 実行 | ported のみ Example Server `:4173` |
| 編集 | ported のみ Editor `:8080/?folder=/home/coder/project` |
| Example metadata | [legacy-inventory.json](./legacy-inventory.json) |
| Device metadata | certified-devices の `generated/devices.json`（実行時 fetch） |
| UI 思想 | 親 Issue の chirimen-lite-console を参考にする。本リポジトリには埋め込まない |

親 Issue の「Web UI 入口」は Example Catalog である。Catalog の port は実装どおり **`:4174`** とする。`:4173` は Example Server（Runtime Example の静的配信）であり、Catalog ではない。

host 開発は `pnpm nx serve example-catalog`。Compose の `chirimen-example-catalog` と同じ port `4174` を使うため同時には使わない。手順は [Development](../guides/development.md) と [Browser Development Environment](../guides/browser-development.md)。

## 関連する正本

| 文書 | 内容 |
| --- | --- |
| [legacy-inventory.md](./legacy-inventory.md) | Legacy Example の移植対象と metadata（#251） |
| [catalog-metadata.md](./catalog-metadata.md) | Example と Device の責務分離、certified-devices join（#252） |
| [schematic-compatibility.md](./schematic-compatibility.md) | 回路図の再利用と Pi 3 / 4 / 5 机上確認（#253） |
| [runtime-verification.md](./runtime-verification.md) | Catalog / Runtime Example の機別実機記録（#257） |
| [workspace/README.md](../../workspace/README.md) | Runtime Example の配置 |
| [Architecture overview](../architecture/overview.md) | リポジトリ構造 |

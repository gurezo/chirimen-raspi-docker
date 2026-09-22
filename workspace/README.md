# CHIRIMEN Examples

host `./workspace` は Example の作業領域です。Raspberry Pi OS Desktop 上の任意エディタ、または Browser Editor（code-server）のどちらからでも同じディレクトリを編集できます。2経路の概要は [Getting Started の Example の編集方法（2経路）](../docs/guides/getting-started.md#example-の編集方法2経路)。Phase 7 の HTML サンプルをここに置きます。

保存先:

```text
Desktop 任意エディタ / Browser Editor: 同じ host ./workspace
Editor（container）: /home/coder/project
Host:                 ./workspace
```

Desktop の任意エディタ・Browser Editor（`:8080`）・Example Server（`:4173`）は同じ host `./workspace` を指します。Browser Editor 利用時は bind mount です。container 内だけには保存されません。`docker compose down` 後も host `./workspace` は残ります。

GPIO / I2C 操作は Editor ではなく、Browser の Example ページ → Polyfill → WebSocket → Runtime です。この workspace に `package.json` / `node_modules` は置きません。`pnpm` / `nx` は host で使います。Browser Editor の手順は [Browser Development Environment](../docs/guides/browser-development.md)。実機 E2E は [Compatibility](../docs/architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）。

Example Catalog（`:4200`）は題材の発見入口です。ported Example の「実行」は Example Server、「編集」は Editor の既存 workspace ルート（`/home/coder/project`）を開きます。Terminal → Run Task → **Open Example Catalog** は URL 案内です。出典・責務は [catalog.md](../docs/examples/catalog.md)（[#258](https://github.com/gurezo/chirimen-raspi-docker/issues/258)）。Runtime の確認は [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md) です。

回路・検証仕様の markdown は [docs/examples](../docs/examples/) にあります。

## 配置

| ディレクトリ | 内容 |
| --- | --- |
| `my-first-example/` | 初心者向け最初の自作 Example（BCM 26 LED Blink） |
| `led-blink/` | GPIO LED Blink（BCM 26） |
| `button/` | GPIO Input / onchange（BCM 5 + LED） |
| `i2c-scan/` | I2C Scan（bus 1。ADT7410 expected `0x48`） |
| `pir-sensor/` | GPIO PIR Sensor（BCM 12。KP-IR412） |
| `adt7410/` | ADT7410 温度読み取り（bus 1 / `0x48`） |
| `sht30/` | SHT30 温湿度（bus 1 / `0x44`） |
| `ads1115/` | ADS1115 4ch ADC（bus 1 / `0x48`） |

## 起動

1. Runtime + Editor + Examples + Catalog を起動する（host で `./scripts/start.sh`）
2. 題材探し: `http://127.0.0.1:4200/`。Terminal → Run Task → **Open Example Catalog**（URL 案内）
3. HTML サンプル: Compose が起動済み。Terminal → Run Task → **Serve examples**（URL 案内）
4. 別 Browser タブで Example Server を開く。Catalog の「実行」でも同じ URL を開く

Example の確認先:

```text
http://127.0.0.1:4173/my-first-example/
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
http://127.0.0.1:4173/pir-sensor/
http://127.0.0.1:4173/adt7410/
http://127.0.0.1:4173/sht30/
http://127.0.0.1:4173/ads1115/
```

HTML サンプルは `./scripts/start.sh` で Compose が配信する。host だけで起動する場合:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

## Runtime 確認

Host は `./scripts/doctor.sh`、Server は `GET /health`、Browser は GPIO LED Blink / GPIO Input / I2C Scan です。Catalog の「Runtime 確認」からも開けます。手順は [Runtime Diagnostics](../docs/guides/runtime-diagnostics.md)。

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

## 変更の反映

標準操作は `Edit → Save → Browser reload` です。静的ファイルのため hot reload はありません。確認先は Example Server `:4173` です。Catalog（`:4200`）には保存結果は出ません。WebSocket 先は `ws://localhost:33330/` です。初心者向けの一連手順は [Getting Started の Example Server :4173 で実行・更新する](../docs/guides/getting-started.md#example-server-4173-で実行更新する)。

`polyfill.js` を更新するときは host のリポジトリルートで `pnpm nx bundle browser-polyfill` を実行します。

# CHIRIMEN Examples

Browser Editor（code-server）の workspace です。Phase 7 の HTML サンプルを編集します。

GPIO / I2C 操作は Editor ではなく、Browser の Example ページ → Polyfill → WebSocket → Runtime です。この workspace に `package.json` / `node_modules` は置きません。`pnpm` / `nx` は host で使います。手順は [Browser Development Environment](../guides/browser-development.md)。

Web Demo（`:4200`）は Example の編集結果確認先ではありません。Runtime / Browser Polyfill / WebSocket / GPIO / I2C の疎通を確認する Diagnostic UI です。

## 配置

| ディレクトリ | 内容 |
| --- | --- |
| `led-blink/` | GPIO LED Blink（BCM 26） |
| `button/` | GPIO Input / onchange（BCM 5 + LED） |
| `i2c-scan/` | I2C Scan（bus 1。ADT7410 expected `0x48`） |

回路仕様の markdown（`gpio-led-blink.md` など）も同じ workspace にあります。

## 起動

1. Runtime + Editor + Examples + Web Demo を起動する（host で `./scripts/start.sh`）
2. HTML サンプル: Compose が起動済み。Terminal → Run Task → **Serve examples**（URL 案内）
3. 別 Browser タブで Example Server を開く

Example の確認先:

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

HTML サンプルは `./scripts/start.sh` で Compose が配信する。host だけで起動する場合:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

## Runtime 確認（Web Demo）

Web Demo はプロジェクトが提供する Runtime Demo / Diagnostic UI です。`docs/examples` の保存結果は反映されません。Terminal → Run Task → **Open Web Demo** は URL 案内です。

```text
http://127.0.0.1:4200/
http://127.0.0.1:4200/#/gpio-output
http://127.0.0.1:4200/#/gpio-input
http://127.0.0.1:4200/#/i2c-scan
```

Web Demo 自体の開発（`pnpm nx serve web-demo`）は [Development Guide](../guides/development.md) を参照してください。

## 変更の反映

静的ファイルのため hot reload はありません。Editor で保存したあと、Example のタブを reload します。WebSocket 先は `ws://localhost:33330/` です。

`polyfill.js` を更新するときは host のリポジトリルートで `pnpm nx bundle browser-polyfill` を実行します。

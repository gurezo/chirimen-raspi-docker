# CHIRIMEN Examples

Browser Editor（code-server）の workspace です。Phase 7 の HTML サンプルを編集します。

GPIO / I2C 操作は Editor ではなく、Browser の Example ページ → Polyfill → WebSocket → Runtime です。この workspace に `package.json` / `node_modules` は置きません。`pnpm` / `nx` は host で使います。

## 配置

| ディレクトリ | 内容 |
| --- | --- |
| `led-blink/` | GPIO LED Blink（BCM 26） |
| `button/` | GPIO Input / onchange（BCM 5 + LED） |
| `i2c-scan/` | I2C Scan（bus 1。ADT7410 expected `0x48`） |

回路仕様の markdown（`gpio-led-blink.md` など）も同じ workspace にあります。

## 起動

1. Runtime を起動する（host で `./scripts/start.sh --editor`）
2. Terminal → Run Task → **Serve examples**
3. 別 Browser タブで開く

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

Terminal から直接起動する場合:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

## 変更の反映

静的ファイルのため hot reload はありません。Editor で保存したあと、Example のタブを reload します。WebSocket 先は `ws://localhost:33330/` です。

`polyfill.js` を更新するときは host のリポジトリルートで `pnpm nx bundle browser-polyfill` を実行します。

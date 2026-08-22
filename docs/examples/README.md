# CHIRIMEN Examples

Browser Editor（code-server）の workspace です。Phase 7 の HTML サンプルを編集します。

GPIO / I2C 操作は Editor ではなく、Browser の Example ページ / Web Demo → Polyfill → WebSocket → Runtime です。この workspace に `package.json` / `node_modules` は置きません。`pnpm` / `nx` は host で使います。

## 配置

| ディレクトリ | 内容 |
| --- | --- |
| `led-blink/` | GPIO LED Blink（BCM 26） |
| `button/` | GPIO Input / onchange（BCM 5 + LED） |
| `i2c-scan/` | I2C Scan（bus 1。ADT7410 expected `0x48`） |

回路仕様の markdown（`gpio-led-blink.md` など）も同じ workspace にあります。

## 起動

1. Runtime + Editor + Examples + Web Demo を起動する（host で `./scripts/start.sh --editor`）
2. HTML サンプル: Compose が起動済み。Terminal → Run Task → **Serve examples**（URL 案内）
3. Web Demo: Compose が起動済み。Terminal → Run Task → **Open Web Demo**
4. 別 Browser タブで開く

HTML サンプル:

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

Web Demo（Start / Stop UI）:

```text
http://127.0.0.1:4200/
http://127.0.0.1:4200/#/gpio-output
http://127.0.0.1:4200/#/gpio-input
http://127.0.0.1:4200/#/i2c-scan
```

HTML サンプルは `--editor` で Compose が配信する。host だけで起動する場合:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

## 変更の反映

静的ファイルのため hot reload はありません。Editor で保存したあと、Example のタブを reload します。Web Demo の Compose 経路も production build のため HMR はありません。WebSocket 先は `ws://localhost:33330/` です。

`polyfill.js` を更新するときは host のリポジトリルートで `pnpm nx bundle browser-polyfill` を実行します。host で Vite HMR を使う場合は `pnpm nx serve web-demo`（port 4200 が衝突するので Compose の `chirimen-web-demo` を止める）。

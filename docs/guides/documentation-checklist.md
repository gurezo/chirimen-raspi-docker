# Documentation checklist

Service / Port / Workspace / Application 構成を変えたときの Documentation 更新漏れを減らす手順。リポジトリ開発者向けである。利用者向けの Getting Started や Browser Development の操作手順ではない。

関連:

- 親 Issue: [#290 Documentation を現行実装の Example Catalog / Workspace 構成へ同期する](https://github.com/gurezo/chirimen-raspi-docker/issues/290)
- 子 Issue: [#296 Documentation と実装の整合性チェック手順を追加する](https://github.com/gurezo/chirimen-raspi-docker/issues/296)
- [Development Guide](./development.md)（ホスト上の Node.js / pnpm / Nx）
- [Getting Started](./getting-started.md)
- [Browser Development Environment](./browser-development.md)
- [Docker 構成](../architecture/docker.md)（Port / Service / Role の正本）
- [`compose.yaml`](../../compose.yaml)

```text
変更（compose / Port / apps / workspace / Flow）
        ↓
この checklist
        ↓
README / Getting Started / Browser Development / TOP
        ↓
必要なら Compatibility / docker.md / Example ガイド
        ↓
旧名称の軽量検索
```

## いつ使うか

次のいずれかを変えたときに使う。

- [ ] [`compose.yaml`](../../compose.yaml) の Service 名を変更したか
- [ ] Port を変更したか
- [ ] `apps/` を追加・削除したか
- [ ] `workspace/` 構成を変更したか
- [ ] Browser Development Flow を変更したか

該当しなければ、この checklist は不要である。コードコメントや歴史記述だけの変更も対象外である。

## 必ず確認する文書

案内が現行構成と一致しているかを確認する。

- [ ] [README](../../README.md) を更新したか
- [ ] [Getting Started](./getting-started.md) を更新したか
- [ ] [Browser Development Guide](./browser-development.md) を更新したか
- [ ] [Documentation TOP](../site/index.html) を更新したか

Getting Started と Browser Development の Flow 図・Port 表が食い違っていないことも確認する。

## Runtime vs Development メッセージ

親 [#326](https://github.com/gurezo/chirimen-raspi-docker/issues/326) / [#333](https://github.com/gurezo/chirimen-raspi-docker/issues/333) の方針と矛盾していないか確認する。

- [ ] Beginner Host 入口は `./setups/setup.sh` か
- [ ] Runtime 操作は `docker compose up -d` / `down` か（`start.sh` を推奨入口と書いていないか）
- [ ] `swap.sh` / Docker build は Development-only（Pi 4 / Pi 5）か
- [ ] Pi 3 B+ は Runtime-only か
- [ ] 個別 Host script は Advanced / Manual Setup に分離しているか
- [ ] First Example / `workspace/` への接続が切れていないか

## 影響があれば確認する文書

変更が届くときだけ見る。

- [ ] Compatibility に影響するか（[compatibility.md](../architecture/compatibility.md)）
- [ ] [Docker 構成](../architecture/docker.md) の Service / Port / Role 表
- [ ] Example 操作ガイド（[GPIO LED Blink](./gpio-led-blink.md) / [GPIO Input](./gpio-input.md) / [I2C Scan](./i2c-scan.md)）
- [ ] [Architecture overview](../architecture/overview.md) のリポジトリ構成図

## 現行の対応（再掲）

Port / Service / Role の詳細正本は [`compose.yaml`](../../compose.yaml) と [Docker 構成](../architecture/docker.md) である。案内を書くときは次と矛盾させない。

| Port | Service | Role |
| --- | --- | --- |
| 33330 | chirimen-server | Hardware Runtime / WebSocket |
| 8080 | chirimen-editor | Browser Editor / code-server |
| 4173 | chirimen-examples | Example Server / Runtime Examples |
| 4200 | chirimen-example-catalog | Example Catalog |

- 編集先は `workspace/`
- `docs/examples` は回路仕様・出典であり、編集用 Workspace ではない
- Web Demo / `chirimen-web-demo` / `nx serve web-demo` を通常利用フローとして案内しない

## 旧名称の軽量検索

通常利用手順に旧名称が残っていないかを確認する。

```bash
grep -RniE 'web-demo|chirimen-web-demo|docs/examples|nx serve web-demo' \
  README.md docs .github
```

`scripts/` / `compose.yaml` / `apps/` / `docker/` / `workspace/` も変えたときは、同じパターンでそこも見る。

ヒットの扱い:

- 通常利用手順として残っている → 直す
- 歴史的経緯（#263 で廃止した記録など）→ 現行手順と区別できていれば残してよい
- `docs/examples` の回路仕様・出典・inventory → 編集場所として案内していなければ残してよい

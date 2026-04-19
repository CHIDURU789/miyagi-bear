# 🐻 宮城県 クマ出没情報

宮城県公式サイトのExcelデータを取得・解析し、出没情報を地図＋一覧で表示するWebアプリです。

---

## ▶ 1クリックで公開する（Node.js不要）

**GitHubアカウントさえあれば、下のボタンを押すだけで公開できます。**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2Fmiyagi-bear&project-name=miyagi-bear&repository-name=miyagi-bear)

> ⚠️ **上のボタンを使う前に**: ボタンのURL中の `YOUR_USERNAME` を自分のGitHubユーザー名に書き換えてください。  
> または、下の「GitHubにpushしてVercelで開く」手順に従ってください。

---

## 📋 公開手順（ステップごと）

### ステップ1 — GitHubにコードをアップする

**GitHubのサイト上で操作（コマンド不要）:**

1. [github.com/new](https://github.com/new) を開く
2. Repository name に `miyagi-bear` と入力
3. **「Create repository」** をクリック
4. 次の画面で **「uploading an existing file」** をクリック
5. zipを解凍したフォルダの中身を**すべて**ドラッグ＆ドロップ
6. **「Commit changes」** をクリック

---

### ステップ2 — Vercelでデプロイする

**Vercelのサイト上で操作（コマンド不要）:**

1. [vercel.com](https://vercel.com) を開いて **「GitHubでログイン」**
2. **「Add New Project」** をクリック
3. `miyagi-bear` リポジトリを選んで **「Import」**
4. 設定はそのままで **「Deploy」** をクリック
5. 2〜3分で完了 → `https://miyagi-bear-xxxx.vercel.app` が発行される 🎉

---

### ステップ3 — 以降の更新方法

GitHubのリポジトリページでファイルを直接編集して「Commit」するだけで、**自動的に再デプロイ**されます。

---

## ⚠️ 重要な注意事項

**このアプリは情報提供のみを目的とし、安全を保証するものではありません。**  
最新情報・緊急時は[宮城県公式サイト](https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html)および地元自治体・警察にお問い合わせください。

---

## 機能一覧

- 宮城県公式ExcelデータをサーバーサイドでParseして表示
- 市町村フィルタ・種別フィルタ（目撃 / 痕跡 / 人身被害）
- 種別ごとの色分け・危険度ラベル（高/中/低）
- 🗺️ Leaflet + OpenStreetMap 地図表示
- ⊞ 地図＋リスト分割ビュー（PC）
- マーカークリック → リストのカードにハイライト＆スクロール
- 原文データ（raw_text）を展開表示
- データ取得失敗時のフォールバック（HTMLパース → サンプルデータ）
- 60分サーバーサイドキャッシュ

---

## ローカルで動かす場合（Node.jsがある人向け）

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## ファイル構成

```
miyagi-bear/
├── vercel.json                       # Vercelデプロイ設定
├── src/
│   ├── app/
│   │   ├── api/bears/route.ts        # データ取得API（Excel/HTMLパース・キャッシュ）
│   │   ├── globals.css               # スタイル
│   │   ├── layout.tsx
│   │   └── page.tsx                  # メインUI
│   ├── components/
│   │   ├── BearCard.tsx              # 出没情報カード
│   │   ├── BearMap.tsx               # Leaflet地図
│   │   └── BearMapWrapper.tsx        # SSR無効化ラッパー
│   └── lib/
│       ├── geo.ts                    # 市町村座標辞書
│       ├── parser.ts                 # Excel/HTMLパーサー
│       └── types.ts                  # 型定義
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## データソース

宮城県公式サイト「令和8年度クマ目撃等情報」  
https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html

# 開発用コマンド一覧

## NPMスクリプト
```bash
# 開発サーバーの起動（ホットリロード付き）
npm run dev

# TypeScriptコンパイルとプロダクションビルド
npm run build  

# ビルド済みファイルのプレビュー
npm run preview

# 依存関係のインストール
npm install
```

## Cloudflare Pagesデプロイ
```bash
# 手動デプロイ（wranglerが必要）
npm run build
npx wrangler pages deploy dist
```

## Gitコマンド（Linux環境）
```bash
# 現在の状態確認
git status

# 変更内容の確認
git diff

# ステージングと コミット
git add .
git commit -m "メッセージ"

# リモートへのプッシュ
git push origin main

# ブランチ操作
git branch
git checkout -b feature/branch-name
```

## ファイル操作（Linux）
```bash
# ディレクトリ一覧
ls -la

# ファイル検索
find . -name "*.ts"

# テキスト検索
grep -r "検索文字列" src/

# ディレクトリ移動
cd src/
cd ..
```

## 注意事項
- 現在、リンター（ESLint）やフォーマッター（Prettier）は設定されていない
- テストフレームワークも未設定
- TypeScriptのコンパイルチェックは`npm run build`時に実行される
# Neko Omake - ブラウザアクションゲーム

ブラウザで動作するアクションゲームプロジェクトです。Cloudflare Pagesでのデプロイに最適化されています。

## 技術スタック

- **言語**: TypeScript
- **ビルドツール**: Vite
- **デプロイ**: Cloudflare Pages対応

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# ビルドファイルのプレビュー
npm run preview
```

## Cloudflare Pagesへのデプロイ

### 方法1: GitHub連携（推奨）

1. GitHubリポジトリをCloudflare Pagesに接続
2. ビルド設定:
   - **ビルドコマンド**: `npm run build`
   - **ビルド出力ディレクトリ**: `dist`
   - **Node.jsバージョン**: 18以上

### 方法2: 手動デプロイ

```bash
# ビルド実行
npm run build

# Cloudflare CLIでデプロイ（要: wrangler インストール）
npx wrangler pages deploy dist
```

## プロジェクト構成

```
neko-omake/
├── src/              # ソースコード
│   └── main.ts       # エントリーポイント
├── public/           # 静的ファイル
│   └── _redirects    # Cloudflare Pages用リダイレクト設定
├── dist/             # ビルド出力（gitignore対象）
├── index.html        # HTMLテンプレート
├── vite.config.ts    # Vite設定
├── tsconfig.json     # TypeScript設定
└── package.json      # プロジェクト設定
```

## ゲーム操作

- **移動**: 矢印キー または WASDキー

## 特徴

- Cloudflare Pagesのエッジ環境で高速動作
- TypeScriptによる型安全な開発
- Viteによる高速な開発環境
- 静的ファイルとして完全にビルド可能
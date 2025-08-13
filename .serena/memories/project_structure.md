# プロジェクト構造

## ディレクトリ構成
```
neko-omake/
├── src/                    # TypeScriptソースコード
│   └── main.ts            # ゲームのエントリーポイント（Gameクラス定義）
├── public/                # 静的ファイル
│   └── _redirects        # Cloudflare Pages用リダイレクト設定
├── dist/                  # ビルド出力（gitignore対象）
├── .serena/              # Serena MCP設定
├── index.html            # HTMLテンプレート（ゲームキャンバス定義）
├── vite.config.ts        # Vite設定（ビルド最適化、エイリアス定義）
├── tsconfig.json         # TypeScript設定（strictモード）
├── package.json          # プロジェクト依存関係とスクリプト
├── package-lock.json     # 依存関係のロックファイル
├── CLAUDE.md            # Claude Code用のガイドライン
├── Readme.md            # プロジェクトドキュメント
└── .gitignore           # Git除外設定

## 主要ファイルの役割

### src/main.ts
- Gameクラスの定義
- ゲームループの実装
- キャンバスレンダリング

### index.html
- ゲームキャンバス（id="gameCanvas"）
- アプリケーションコンテナ（id="app"）
- グラデーション背景のスタイリング

### vite.config.ts
- Cloudflare Pages用の最適化設定
- Terserによる圧縮設定
- `@`エイリアスの定義（src/ディレクトリを指す）

## 依存関係
- **開発依存関係のみ**:
  - typescript: ^5.9.2
  - vite: ^7.1.1
  - terser: ^5.43.1
  - @types/node: ^24.2.1
- **本番依存関係なし**（完全に静的なビルド）
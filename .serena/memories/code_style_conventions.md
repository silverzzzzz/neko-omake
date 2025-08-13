# コードスタイルと規約

## TypeScript設定（tsconfig.json）
- **ターゲット**: ES2020
- **モジュール**: ESNext  
- **Strictモード**: 有効（厳密な型チェック）
- **未使用変数チェック**: 有効（noUnusedLocals, noUnusedParameters）
- **Switch文フォールスルーチェック**: 有効

## 命名規則（推奨）
- **クラス名**: PascalCase（例: `Game`, `Player`）
- **変数・関数名**: camelCase（例: `gameCanvas`, `updatePosition`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_SPEED`, `CANVAS_WIDTH`）
- **ファイル名**: kebab-case.ts（例: `game-manager.ts`）

## インポート
- エイリアス`@`が`src`ディレクトリを指す
- 例: `import { Game } from '@/game'`

## プロジェクト構造の規約
- すべてのソースコードは`src/`ディレクトリ内に配置
- エントリーポイントは`src/main.ts`
- 静的ファイルは`public/`ディレクトリに配置
- ビルド出力は`dist/`（gitignore対象）

## 最適化の方針
- バンドルサイズの最小化を常に意識
- 不要な依存関係を避ける
- Tree-shakingを活用するため、ES Modulesを使用
- Terserによる圧縮を前提とした記述

## 注意事項
- 現在ESLintやPrettierの設定はないため、TypeScriptコンパイラの警告に従う
- VSCode等のエディタの自動フォーマットに依存
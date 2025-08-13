# タスク完了時のチェックリスト

## 必須確認事項

### 1. TypeScriptコンパイルチェック
```bash
npm run build
```
- エラーがないことを確認
- 警告も可能な限り解消

### 2. 開発サーバーでの動作確認
```bash
npm run dev
```
- ブラウザで正常に動作することを確認
- コンソールエラーがないことを確認

### 3. プロダクションビルドの確認
```bash
npm run build
npm run preview
```
- ビルド後のファイルが正常に動作することを確認
- バンドルサイズが適切であることを確認

### 4. コード品質チェック
- TypeScriptのstrictモードに準拠しているか
- 未使用の変数や関数がないか
- 型定義が適切に行われているか

### 5. Git操作（必要に応じて）
```bash
git status
git diff
git add .
git commit -m "適切なコミットメッセージ"
```

## 注意事項
- 現在、自動テストやリンターは設定されていない
- TypeScriptコンパイラのチェックが主な品質保証手段
- Cloudflare Pagesへのデプロイ前に必ず`npm run build`でビルドが成功することを確認
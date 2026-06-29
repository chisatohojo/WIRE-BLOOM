# WIRE BLOOM

## ゲーム概要

WIRE BLOOM は TypeScript + Vite + Phaser で構築している、ワイヤーフレーム調の2Dアクション試作ゲームです。

プレイヤーコアを移動させながら、マウス方向へ扇形パルスを撃ち、敵撃破、shockwave連鎖、EXP回収、Level UP強化でランを伸ばしていきます。

Repository: https://github.com/chisatohojo/WIRE-BLOOM.git

## セットアップ

```bash
npm install
```

PowerShell で `npm.ps1` の実行ポリシーエラーが出る場合は、VS Code のターミナルを Command Prompt に切り替えるか、`npm.cmd install` のように `npm.cmd` を使ってください。

開発サーバー:

```bash
npm run dev
```

起動後、Vite が表示するローカルURLをブラウザで開きます。

ビルド:

```bash
npm.cmd run build
```

ビルド結果は `dist` に出力されます。

## 操作

- `WASD` または矢印キー: プレイヤーコアを移動
- `Space` または左クリック長押し: パルスをチャージ
- 入力を離す: パルス発射
- Level UP メニュー: クリック、または `1`〜`3` で強化を選択
- `Esc`: ポーズメニュー
- `M`: サウンドのミュート/解除
- `F3`: デバッグ表示の表示/非表示

F3デバッグ表示がONの時だけ使えるテスト用ホットキー:

- `F6`: レベルを1上げる
- `F7`: HPを1回復
- `F8`: 近くにボスを1体スポーン
- `F9`: 敵を全消去

## 現在の主な機能

- タイトル画面、Options、Records
- 日本語/英語UI切り替えとlocalStorage保存
- 自機移動、HP、被ダメージ、Game Over / Results
- マウス方向への扇形パルス攻撃
- 敵撃破時の全方位shockwaveと連鎖
- 敵タイプごとのHP、速度、ダメージ、EXP、スポーン重み
- 高HP敵による低HP敵スポーン
- EXPオーブ吸引、コンボ、Level UPランダム3択
- サウンドシステムと音量設定
- F3デバッグ表示とバランステスト用ホットキー

詳細ドキュメント:

- [ゲーム仕様](docs/gameplay_design.md)
- [調整値リファレンス](docs/tuning_reference.md)
- [ロードマップ](docs/roadmap.md)
- [i18n参照](docs/i18n_reference.txt)

UI文言を追加・変更した場合は、`src/config/localization.ts` と `docs/i18n_reference.txt` を一緒に更新してください。

## 今後の予定

- ゲームバランスの継続調整
- 敵、アップグレード、報酬演出の拡張
- ワイヤー接続やブルーム表現の試作
- 障害物などのゲームオブジェクト追加
- サウンドとフォントアセットの追加
- Electron / Steam対応の検討

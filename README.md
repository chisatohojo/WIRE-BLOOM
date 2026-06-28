# WIRE BLOOM

TypeScript + Vite + Phaser で構築した、2Dアクション試作ゲームです。

## セットアップ

```bash
npm install
```

PowerShell で `npm.ps1` の実行ポリシーエラーが出る場合は、VS Code のターミナルを Command Prompt に切り替えるか、`npm.cmd install` のように `npm.cmd` を使ってください。

## 開発サーバー

```bash
npm run dev
```

起動後、Vite が表示するローカルURLをブラウザで開きます。

## ビルド

```bash
npm.cmd run build
```

ビルド結果は `dist` に出力されます。

## 操作

- `Space` または左クリック長押し: パルスをチャージ
- 入力を離す: パルス発射
- Level UP メニュー: クリック、または `1` / `2` / `3` で強化を選択
- `F3`: デバッグ表示の表示/非表示を切り替え

## デバッグ表示

`F3` で、画面左上にチューニング用のデバッグ表示を出せます。通常プレイ中も Level UP メニュー中も切り替えできます。

表示項目:

- FPS
- 敵の数
- 経験値
- レベル
- コンボ
- 現在のチャージ量

## チューニング設定

主要な調整値は `src/config/gameplayConfig.ts` に集約しています。まずゲームバランスや気持ちよさを触る場合は、このファイルから調整してください。

- `enemy.spawnIntervalMs`: 敵の出現間隔
- `enemy.speedMin` / `enemy.speedMax`: 敵の移動速度レンジ
- `pulse.baseRadius`: パルスの基本半径
- `pulse.chargeRadiusMultiplier`: 最大チャージ時のパルス半径倍率
- `expOrb.magnetSpeed`: 経験値オーブがコアへ吸い寄せられる速度
- `progression.baseExpToNextLevel`: レベル2に必要な経験値
- `progression.expGrowthPerLevel`: レベルごとに増える必要経験値
- `combo.graceMs`: コンボが継続する猶予時間
- `combo.screenShakeStrength`: コンボ時の画面揺れの基本強度
- `combo.slowMotionDurationMs`: コンボ節目で発生するスローモーション時間

## 現在の実装内容

- Phaser.Game の起動設定
- ワイヤーフレーム風のゲーム画面
- 中央のプレイヤーコア
- 画面外から出現し、中央へ向かう敵
- チャージ量に応じたパルス半径とダメージ
- 敵撃破時の経験値オーブ
- EXP、レベル、コンボHUD
- コンボによる画面揺れと短いスローモーション
- Level UP 時の3択アップグレード
- F3デバッグ表示

## 今後の実装候補

- ワイヤー接続やブルーム表現の試作
- 敵、経験値、コンボのバランス調整
- プレイヤー強化やLevel UP候補の拡張
- 障害物などのゲームオブジェクト
- サウンドとフォントアセットの追加
- Electron によるデスクトップアプリ化
- Steam 配布を見据えたビルドフロー整備

## GitHub

https://github.com/chisatohojo/WIRE-BLOOM.git

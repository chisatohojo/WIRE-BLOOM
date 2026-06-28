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
- `M`: サウンドのミュート/解除を切り替え

## デバッグ表示

`F3` で、画面左上にチューニング用のデバッグ表示を出せます。通常プレイ中も Level UP メニュー中も切り替えできます。

表示項目:

- FPS
- 敵の数
- 経験値
- レベル
- コンボ
- 現在のチャージ量

## サウンド

外部音声ファイルはまだ使わず、ブラウザの Web Audio API で短い仮SEを生成しています。初回クリック、または初回 `Space` 入力で AudioContext を resume します。

- `pulse`: 90Hz から 60Hz へ下がる短い低音と高音ノイズ
- `hit`: 600Hz付近の短い矩形波クリック
- `orb`: 900Hzから1400Hz付近の短いサイン波。連続吸収時にピッチが少しずつ上がります
- `combo10`: 10コンボごとの短い2音コード
- `combo50`: 50コンボごとの短い3音コード
- `levelup`: 523Hz、659Hz、784Hz、1046Hz の上昇アルペジオ
- `select`: 440Hzから少し上がる短音
- `uiHover`: Level UP選択肢に触れた時の控えめな短音

音量、ピッチ、長さ、同時発音の抑制値は `src/config/audioConfig.ts` で調整できます。

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
- `hud.titleVisibleMs` / `hud.titleFadeMs`: タイトル表示時間とフェード時間
- `hud.comboPopScale` / `hud.comboPopDurationMs`: コンボ表示のスケール演出
- `levelUp.backdropAlpha`: Level UP中の背景暗幕の濃さ
- `effects.pulseRingDurationMs` / `effects.pulseRingAlpha`: パルスリングの余韻と透明度
- `effects.enemyBurstParticles` / `effects.enemyShardAlpha`: 敵撃破破片の量と透明度
- `effects.enemyFlashDurationMs`: 敵撃破フラッシュ時間
- `effects.coreAbsorbGlowDurationMs`: EXP吸収時のコア発光時間
- `expOrb.terminalAccelerationMultiplier`: EXPオーブ吸収終盤の加速量

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

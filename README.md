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

- `WASD` または矢印キー: プレイヤーコアを移動
- `Space` または左クリック長押し: パルスをチャージ
- 入力を離す: パルス発射
- Level UP メニュー: クリック、または `1`〜`3` で強化を選択
- `F3`: デバッグ表示の表示/非表示を切り替え
- `M`: サウンドのミュート/解除を切り替え

## 攻撃とコンボ

パルス攻撃は全周囲ではなく、現在のプレイヤーコア位置からマウスカーソル方向へ撃つ扇形攻撃です。初期角度幅は30°で、中心角から左右15°以内、かつパルス半径内にいる敵へヒットします。角度判定は0°/360°またぎに対応しています。

コンボは敵を撃破した時だけ増えます。パルス直撃で倒した敵も、撃破時ショックウェーブの連鎖で倒した敵も対象で、1体撃破ごとにコンボが増えます。パルスを撃って1体も倒せなかった場合は、ダメージを与えていても空撃ち扱いになり、コンボが少し減ります。

敵がパルスで倒されると、その敵の位置から全方位の円形ショックウェーブが発生します。ショックウェーブ内の敵にもダメージが入り、倒れた敵からさらに連鎖します。連鎖上限と半径倍率は `src/config/gameplayConfig.ts` で調整できます。

通常プレイ画面の左下にも、Pulse Radius、Pulse Angle、Orb Magnet、Shockwave Radius、Shockwave Combo Bonus の現在値を表示します。

## ワールドと敵

プレイフィールドは画面サイズより大きいワールドとして扱い、カメラがプレイヤーを追従します。プレイヤーはワールド外へ出ないようにクランプされ、敵の追跡、パルス、ショックウェーブ、EXPオーブもワールド座標で処理されます。

敵はプレイヤー周辺の一定距離外に出現します。初期HPが一定以上の敵は、自分より初期HPが低い敵タイプを周囲に子敵としてスポーンできます。`heavy` は small / normal、`tank` は small / normal / heavy、`boss` は small / normal / heavy / tank を候補にします。

子敵スポーンは `spawnWeight` を使って候補からランダム選択され、全体の `maxEnemies` と親ごとの `maxSpawnedChildren` で増殖を制御します。ポーズ、Level UP、Game Over中は進行しません。`boss` タイプは高HP・低速の大型ワイヤーフレーム敵で、子敵スポーン数と上限が少し多めに設定されています。

EXPオーブは常に吸い込まれるのではなく、現在の Orb Magnet 範囲に入ってからコアへ向かいます。Orb Magnetアップグレードは吸引倍率と吸引範囲の両方を伸ばします。

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
- `enemy.maxEnemies`: 同時に存在できる敵の上限
- `enemy.spawnDistanceMin` / `enemy.spawnDistanceMax`: プレイヤー周辺の敵出現距離
- `enemy.childSpawnerMinHp`: 子敵スポーン可能になる初期HPしきい値
- `enemy.defaultChildSpawnIntervalMs`: 子敵スポーンの共通間隔
- `enemy.defaultChildSpawnCount`: 子敵スポーンの共通生成数
- `enemy.defaultMaxSpawnedChildrenPerEnemy`: 親1体あたりの共通子敵上限
- `enemy.childSpawnDistanceMin` / `enemy.childSpawnDistanceMax`: 子敵が親から離れて出る距離
- `world.width` / `world.height`: プレイフィールドの広さ
- `core.radius` / `core.outerRadius`: プレイヤーコアの描画サイズ
- `player.collisionRadius`: プレイヤー接触判定半径
- `pulse.baseRadius`: パルスの基本半径
- `pulse.chargeRadiusMultiplier`: 最大チャージ時のパルス半径倍率
- `combatTuning.pulseAngleInitialDegrees`: 扇形パルスの初期角度幅
- `combatTuning.pulseAngleUpgradeAmountDegrees`: Pulse Angleアップグレードの増加量
- `combatTuning.shockwaveBaseRadius`: 敵撃破時ショックウェーブの基本半径
- `combatTuning.shockwaveRadiusUpgradeAmount`: Shockwave Radiusアップグレードの増加量
- `shockwave.damage`: ショックウェーブのダメージ
- `combatTuning.comboShockwaveRadiusBonusPerCombo`: コンボ1ごとのショックウェーブ半径倍率ボーナス
- `combatTuning.maxShockwaveRadiusMultiplier`: ショックウェーブ半径倍率の上限
- `combatTuning.maxShockwaveChainPerPulse`: 1回のパルス内で処理する最大ショックウェーブ連鎖数
- `expOrb.magnetSpeed`: 経験値オーブがコアへ吸い寄せられる速度
- `expOrb.baseMagnetRadius`: EXPオーブが吸引開始する基本範囲
- `progression.baseExpToNextLevel`: レベル2に必要な経験値
- `progression.expGrowthPerLevel`: レベルごとに増える必要経験値
- `combo.graceMs`: コンボが継続する猶予時間
- `combo.comboPerEnemyDefeated`: 敵1体撃破ごとのコンボ増加量
- `combo.comboMissPenalty`: パルスで撃破できなかった時のコンボ減少量
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
- `upgrades.enemySpawnRateBonus`: Enemy Density 1回取得ごとの敵出現倍率増加量
- `upgrades.enemySpawnRateMax`: Enemy Density による敵出現倍率の上限

## Level UP

Level UPメニューには、強化候補全体からランダムに選ばれた重複なしの3択が表示されます。最大レベルに到達した強化は候補から外れ、Heal HP はHPが満タンの時には候補から外れます。強化定義は `src/config/upgradeConfig.ts` にまとめています。

Level UPメニューには現在の主要強化値として、Pulse Radius、Pulse Angle、Pulse Damage、Orb Magnet、Shockwave Radius、Shockwave Combo Bonus、Move Speed、Enemy Density を表示します。通常プレイ画面のアップグレード状況表示と同じ内容です。

追加アップグレード:

- `Pulse Angle +5°`: 扇形パルスの角度幅を5°広げます
- `Shockwave Radius +`: 敵撃破時の全方位円形ショックウェーブの基本半径を広げます
- `Pulse Damage`: パルスのダメージを上げます
- `Shockwave Combo Bonus`: コンボによるショックウェーブ半径倍率を強化します
- `Move Speed +`: プレイヤー移動速度を上げます
- `Max HP +`: 最大HPを1増やし、現在HPも1回復します
- `Heal HP`: 現在HPを1回復します
- `Enemy Density +`: 敵の出現頻度を上げます。経験値獲得機会も増えますが、危険も増えるリスク/リターン強化です

## 現在の実装内容

- Phaser.Game の起動設定
- ワイヤーフレーム風のゲーム画面
- 小さくなった移動可能なプレイヤーコア
- 画面より大きいワールドと追従カメラ
- プレイヤー周辺に出現し、現在位置を追う敵
- 初期HPが高い敵による子敵スポーン
- 子敵を多めに召喚するボス敵
- チャージ量に応じたパルス半径とダメージ
- 吸引範囲内に入るとコアへ向かう経験値オーブ
- EXP、レベル、コンボHUD
- コンボによる画面揺れと短いスローモーション
- Level UP 時のランダム3択アップグレード
- Enemy Density による敵出現頻度アップ
- F3デバッグ表示

## 今後の実装候補

- ワイヤー接続やブルーム表現の試作
- 敵、経験値、コンボのバランス調整
- プレイヤー強化やLevel UP候補の拡張
- 障害物などのゲームオブジェクト
- サウンドとフォントアセットの追加
- Electron によるデスクトップアプリ化
- Steam 配布を見据えたビルドフロー整備

## Pause / Settings / Stats

- The game now starts on `TitleScene`. Choose Start Game to enter `GameScene`.
- Title menu: Start Game, Options, Records, and Quit.
- Options on the title screen uses the same saved language and volume settings as the pause menu.
- Records shows total runs, total play time, best level, best combo, total enemies defeated, total pulses fired, total EXP collected, total upgrades taken, and total heals taken.
- Total records are saved in `localStorage` under `wireBloom.totalStats`.
- `Esc`: Open or close the pause menu. Gameplay movement, spawning, combo timers, pulse effects, and EXP orb updates stop while paused.
- Pause menu: Resume, Settings, Stats, Restart, and Quit to Title. Restart and Quit to Title save the current run into total records once.
- Settings: Change Language between Japanese and English, adjust Master / SFX / Music volume in 10% steps, and toggle Muted.
- `M`: Toggle mute at any time. The pause menu mute display stays synced with this shortcut.
- Stats: Shows current-run play time, level reached, max combo, enemies defeated, pulses fired, EXP collected, upgrades taken, heals taken, and score.
- Settings are saved in `localStorage` under `wireBloom.settings` and `wireBloom.language`.
- UI text is routed through `src/systems/LocalizationSystem.ts` with strings in `src/config/localization.ts`.
- Developer-facing localization reference: `docs/i18n_reference.txt`. Update it together with `src/config/localization.ts` when UI text changes.

## Player / HP / Game Over

- Move the player core with `WASD` or the arrow keys. Pulse attacks, enemy tracking, and EXP orb magnet targets use the current player position.
- Player HP starts at `5`. Enemy contact deals type-specific damage, briefly grants invincibility, flashes the core red, and removes the contacting enemy without EXP or shockwave rewards.
- When HP reaches `0`, gameplay stops and a Game Over / Results panel shows play time, level reached, max combo, enemies defeated, pulses fired, EXP collected, upgrades taken, heals taken, and score.
- Restart and Quit to Title save the run once into total records.
- Enemy speed grows over time by `enemy.speedGrowthPerSecond` and is capped by `enemy.speedMaxMultiplier`; F3 debug shows the current enemy speed multiplier.
- Enemy types are configured in `gameplayConfig.enemy.types`: small, normal, heavy, tank, and boss have different HP, speed, damage, EXP, spawn weight, size, and color.
- Score uses `gameplayConfig.score`: enemies defeated, EXP collected, max combo, level reached, and play time seconds.

## Shockwave Tuning Note

- Shockwave base radius is currently `48`, and `Shockwave Radius +` adds `6` each time.
- Combo shockwave radius bonus is `+2.5%/combo`, capped by `combatTuning.maxShockwaveRadiusMultiplier`.
- Shockwave visuals use a stronger outer ring, a subtle fill glow, an inner ring, and short wireframe spokes.
- Visual emphasis values live in `effects.shockwaveRingDurationMs`, `effects.shockwaveRingAlpha`, `effects.shockwaveRingWidth`, and the `effects.shockwaveRing*` fields.

## GitHub

https://github.com/chisatohojo/WIRE-BLOOM.git

# WIRE BLOOM Tuning Reference

ゲームバランス調整で最初に見るファイルは `src/config/gameplayConfig.ts` です。アップグレード候補の表示名、説明、重み、最大レベルは `src/config/upgradeConfig.ts` にあります。

## Player / Core

- `core.radius`: プレイヤーコア本体の描画半径
- `core.outerRadius`: 外周リングの描画半径
- `player.collisionRadius`: 敵接触判定半径
- `player.maxHp`: 初期最大HP
- `player.speed`: 基本移動速度
- `player.invincibilityMs`: 被ダメージ後の無敵時間
- `player.damageFlashMs`: 被ダメージ時フラッシュ時間

## World / Camera

- `world.width`: ワールド幅
- `world.height`: ワールド高さ
- `grid.spacing`: 背景グリッド間隔

## Enemy Spawn / Movement

- `enemy.spawnIntervalMs`: 通常敵スポーンの基本間隔
- `enemy.maxEnemies`: 同時に存在できる敵の上限
- `enemy.spawnDistanceMin`: プレイヤーからの最小スポーン距離
- `enemy.spawnDistanceMax`: プレイヤーからの最大スポーン距離
- `enemy.speedMin`: 敵基本速度の最小値
- `enemy.speedMax`: 敵基本速度の最大値
- `enemy.speedGrowthPerSecond`: 経過秒ごとの敵速度倍率増加量
- `enemy.speedMaxMultiplier`: 敵速度倍率上限

## Enemy Types

`enemy.types` で敵タイプを定義します。

- `id`: タイプID
- `hp`: 初期HP
- `speedMultiplier`: タイプ別速度倍率
- `radius`: 敵半径
- `damageToPlayer`: 接触ダメージ
- `expValue`: 撃破時EXP
- `spawnWeight`: 通常スポーンや子敵候補の重み
- `strokeColor` / `fillColor` / `coreColor`: ワイヤーフレーム表示色
- `sides`: 多角形の辺数
- `childSpawnIntervalMs`: 子敵スポーン間隔のタイプ別上書き
- `childSpawnCount`: 子敵スポーン数のタイプ別上書き
- `maxSpawnedChildren`: 親1体あたりの子敵上限のタイプ別上書き

## Child Spawner

- `enemy.childSpawnerMinHp`: 子敵スポーン可能になる初期HPしきい値
- `enemy.defaultChildSpawnIntervalMs`: 子敵スポーン共通間隔
- `enemy.defaultChildSpawnCount`: 子敵スポーン共通数
- `enemy.defaultMaxSpawnedChildrenPerEnemy`: 親ごとの共通子敵上限
- `enemy.childSpawnDistanceMin`: 親から子敵が出る最小距離
- `enemy.childSpawnDistanceMax`: 親から子敵が出る最大距離

## Pulse

- `pulse.baseRadius`: 最小チャージ時のパルス基本半径
- `pulse.chargeRadiusMultiplier`: 最大チャージ時の半径倍率
- `pulse.minDamage`: 最小チャージ時ダメージ
- `pulse.maxDamage`: 最大チャージ時ダメージ
- `pulse.maxChargeMs`: 最大チャージまでの時間
- `pulse.durationMs`: パルス演出時間
- `combatTuning.pulseAngleInitialDegrees`: 初期扇形角度
- `combatTuning.pulseAngleUpgradeAmountDegrees`: Pulse Angle強化1回分の増加角度

## Combo / Shockwave

- `combo.comboPerEnemyDefeated`: 敵1体撃破ごとのコンボ増加量
- `combo.comboMissPenalty`: 撃破0パルス時のコンボ減少量
- `combo.graceMs`: コンボ継続猶予。通常プレイ中だけ減り、Level UP、Pause、Game Over中は止まる
- `combo.screenShakeStrength`: コンボ画面揺れ基礎値
- `combo.slowMotionDurationMs`: 節目コンボのスローモーション時間
- `shockwave.damage`: shockwaveダメージ
- `combatTuning.shockwaveBaseRadius`: shockwave基本半径
- `combatTuning.shockwaveRadiusUpgradeAmount`: Shockwave Radius強化量
- `combatTuning.comboShockwaveRadiusBonusPerCombo`: コンボ1ごとのshockwave半径倍率ボーナス
- `combatTuning.maxShockwaveRadiusMultiplier`: shockwave半径倍率上限
- `combatTuning.maxShockwaveChainPerPulse`: 1パルス内shockwave連鎖処理上限

## EXP / Progression

- `expOrb.baseMagnetRadius`: EXPオーブ吸引開始範囲
- `expOrb.magnetSpeed`: 吸引速度
- `expOrb.terminalAccelerationDistance`: 終盤加速の開始距離
- `expOrb.terminalAccelerationMultiplier`: 終盤加速倍率
- `expOrb.collectRadius`: 回収判定半径
- `progression.baseExpToNextLevel`: レベル2に必要なEXP
- `progression.expGrowthPerLevel`: レベルごとの必要EXP増加量

## Upgrades

- `upgrades.pulseRadiusMultiplier`: Pulse Radius強化倍率
- `upgrades.orbMagnetMultiplier`: Orb Magnet強化倍率
- `upgrades.comboGraceBonusMs`: Combo Grace強化量
- `upgrades.pulseDamageBonus`: Pulse Damage強化量
- `upgrades.shockwaveComboBonusPerComboBonus`: Shockwave Combo Bonus強化量
- `upgrades.playerSpeedMultiplier`: Move Speed強化倍率
- `upgrades.maxHpBonus`: Max HP強化量
- `upgrades.healAmount`: Heal HP回復量
- `upgrades.enemySpawnRateBonus`: Enemy Density強化1回分の敵出現倍率増加量
- `upgrades.enemySpawnRateMax`: Enemy Density倍率上限

## Score

- `score.enemiesDefeated`: 撃破数スコア係数
- `score.expCollected`: 取得EXPスコア係数
- `score.maxCombo`: 最大コンボスコア係数
- `score.levelReached`: 到達レベルスコア係数
- `score.playTimeSecond`: 生存秒数スコア係数

## Effects / HUD

- `hud.titleVisibleMs`: ゲーム中タイトル表示時間
- `hud.titleFadeMs`: タイトルフェード時間
- `hud.comboPopScale`: コンボ増加時スケール
- `hud.comboPopDurationMs`: コンボ増加時アニメーション時間
- `levelUp.backdropAlpha`: Level UP中の背景暗幕濃度
- `effects.enemyBurstParticles`: 敵撃破破片数
- `effects.pulseRingDurationMs`: パルスリング演出時間
- `effects.shockwaveRingDurationMs`: shockwaveリング演出時間
- `effects.maxParticles`: パーティクル上限

## Debug Hotkeys

`Tab` でデバッグ表示を切り替えます。以下はデバッグ表示がONの時だけ有効です。

- `L`: レベルを1上げる
- `H`: HPを1回復
- `B`: 近くにボスを1体スポーン
- `K`: 敵を全消去

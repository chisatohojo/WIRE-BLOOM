# WIRE BLOOM Gameplay Design

このファイルはゲーム仕様の開発者向けメモです。実際の調整値は主に `src/config/gameplayConfig.ts` と `src/config/upgradeConfig.ts` を参照してください。

## Core Loop

1. プレイヤーコアを移動する
2. `Space` または左クリックでパルスをチャージする
3. マウス方向へ扇形パルスを撃つ
4. 敵を倒してEXPオーブを出す
5. EXPを回収してLevel UPする
6. ランダム3択からアップグレードを選ぶ
7. 敵密度、敵速度、敵タイプが増える中でランを伸ばす

## Player / HP

- プレイヤーは `WASD` または矢印キーで移動する。
- 画面より大きいワールド内を移動し、カメラが追従する。
- 敵に接触するとHPが減り、短い無敵時間に入る。
- 接触した敵は消えるが、EXPやshockwaveは発生しない。
- HPが0になるとGame Over / Results画面を表示する。

## Pulse Attack

- パルスは全方位ではなく、現在のプレイヤー位置からマウス方向へ撃つ扇形攻撃。
- 攻撃判定は半径と角度幅で決まる。
- 角度判定は0度/360度またぎに対応する。
- チャージ量に応じて半径とダメージが上がる。

## Combo

- コンボは敵撃破時のみ増える。
- パルス直撃で倒した敵も、shockwave連鎖で倒した敵もコンボ加算対象。
- 1体撃破ごとの増加量は `gameplayConfig.combo.comboPerEnemyDefeated`。
- 1発のパルスで撃破数が0の場合、`gameplayConfig.combo.comboMissPenalty` だけコンボが減る。
- 敵にダメージを与えても、撃破できなければコンボは増えない。
- コンボは0未満にならない。
- コンボ節目では既存の画面揺れ、サウンド、スローモーションが発生する。

## Shockwave

- パルスで敵を倒すと、その位置から全方位円形shockwaveが発生する。
- shockwave内の敵にもダメージが入り、倒れた敵からさらにshockwaveが発生する。
- 連鎖処理には `combatTuning.maxShockwaveChainPerPulse` の上限がある。
- shockwave半径は基本値、アップグレード、コンボ補正で決まる。

## Enemies

- 敵はプレイヤー周辺の一定距離外に出現する。
- 敵タイプは `small` / `normal` / `heavy` / `tank` / `boss`。
- 各タイプはHP、速度倍率、半径、接触ダメージ、EXP、スポーン重み、色を持つ。
- 時間経過で敵速度倍率が上昇する。
- `Enemy Density +` アップグレードで通常スポーン頻度が上がる。

## Child Spawners

- 初期HPが `enemy.childSpawnerMinHp` 以上の敵は子敵をスポーンできる。
- 子敵候補は、親より初期HPが低い敵タイプのみ。
- 候補の中から `spawnWeight` でランダム選択する。
- 親ごとの子敵上限と全体の `enemy.maxEnemies` を必ず守る。
- Pause、Level UP、Game Over中は子敵スポーンしない。

## EXP / Level UP

- 敵撃破時にEXPオーブを生成する。
- EXPオーブはプレイヤーの吸引範囲内に入るとコアへ向かう。
- EXPが必要値に達するとLevel UPメニューを表示する。
- Level UP候補は `src/config/upgradeConfig.ts` の定義からランダム3択。
- 最大レベル到達済みの候補は除外される。
- `Heal HP` はHP満タン時には候補から外れる。

## Game Over / Results

- HPが0になるとゲーム進行を停止する。
- Resultsにはプレイ時間、到達レベル、最大コンボ、撃破数、発射回数、取得EXP、取得アップグレード、回復回数、スコアを表示する。
- Restart / Quit to Title時にラン戦績を累計戦績へ一度だけ保存する。

## Debug / Balance Test

- `F3` でデバッグ表示を切り替える。
- F3表示中のみ、以下のテスト用ホットキーが有効になる。
- `F6`: レベルを1上げる
- `F7`: HPを1回復
- `F8`: 近くにボスを1体スポーン
- `F9`: 敵を全消去

デバッグ表示にはFPS、敵数、敵タイプ別数、EXPオーブ数、EXP、レベル、コンボ、チャージ量、HP、敵速度倍率、Enemy Density倍率、直近shockwave連鎖数、スコアを表示する。

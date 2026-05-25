# Module Boundary Document — catnip-expansion

**Status:** AWAITING CEREBRO APPROVAL
**Author:** wolverine-implementation
**Date:** 2026-05-25

**Note on file count:** The plan's Task 1.5 explicitly creates `js/audio.js` as a separate file. This document covers 12 files: the 11 listed in Task 1.1 plus `js/audio.js`. Cerebro should confirm whether audio.js is file 9a (inserted between store and input) or merged into another file. The load order below places it at position 10.

---

## 0. Beast Risk Flag Resolutions

Beast-review flagged 10 implementation risks. All are incorporated here as binding decisions for this module boundary and all implementation tasks. Implementors must not deviate from these without a new approval gate.

### CRITICAL — incorporated into schema/design below:

**Flag 1 — NAMING: `ball.bounces` (NOT `ball.bounceCount`)**
Decision: Keep `ball.bounces` — this is the name used in the existing v1 code (`b.bounces`, lines 798–815 of index.html). The plan used `bounceCount` in prose; that was aspirational naming. All implementation tasks (#4, #16, #17, #18, #22) must use `ball.bounces` everywhere: shield reflection check, explosive 3rd-bounce check, magnet 1-bounce conversion, multi-ball split trigger.

**Flag 2 — PER-FRAME CAP: `catHitThisFrame` reset timing**
Decision: `state.run.catHitThisFrame` is reset to `false` at the **top** of `frame()` in game.js, before any physics update. `checkCollisions()` reads and sets it; it never resets it. Documented in state.run schema below.

**Flag 3 — MULTI-BALL SPLIT TIMING**
Decision: The multi-ball split check reads `ball.bounces` **after** `stepBall()` increments it. In `updateBalls()` / `powerups.handleMultiball()`, the sequence is: call `stepBall(b, dt)` → then check `if (b.type === 'multiball' && ball.bounces >= 1)`. Never check before stepping.

**Flag 4 — SHIELD SENTINEL: per-ball reflect counter**
Decision: `ball.shieldReflectCount` is stored on the ball entity (initialized to `0` in `makeBall()`). The shield sentinel checks `ball.shieldReflectCount >= 3` and force-despawns if true. Stored on the ball so multiple in-flight balls each have independent counts. Documented in ball entity schema below.

**Flag 5 — GAME-OVER +5 COIN BONUS double-award guard**
Decision: `state.run.completionBonusAwarded` boolean added to state.run schema (initialized `false`). The game-over branch in frame() checks this before awarding +5 and sets it `true` immediately after. `resetRunState()` clears it to `false`.

**Flag 6 — BUMPER PLACEMENT RETRY CAP**
Decision: `entities.spawnBumpers()` uses a max of 500 placement attempts per bumper. If exhausted, falls back to zone center (clamped to exclusion-zone boundary). No infinite loop possible.

### DESIGN DECISIONS (requiring Cerebro confirmation):

**Flag 7 — `artifact-slow-mo` + dash interaction**
Decision proposed: The speed cap from `artifact-slow-mo` applies every frame unconditionally per the plan ("cap applies regardless of ability"). This means dash boost is suppressed while slow-mo is equipped — dash effectively becomes a direction change only, not a speed boost. This is **intentional per the plan** as written. `abilities.getEffectiveCatSpeedCap()` always returns the artifact cap when slow-mo is equipped; the dash branch does not exempt itself. Cerebro must confirm or override.

**Flag 8 — Teleport valid-position check timing**
Decision: The valid-position check for teleport runs at **reappearance time** (when `abilityTimer` reaches the fade-out duration threshold), not at fade-start time. Moving bumpers will have shifted during the 0.3s fade window; checking at reappearance ensures the landing spot is actually clear. Documented in abilities.js implementation notes.

**Flag 9 — `resetGame` must clear `drag` and `dragCurrent`**
Decision: `Catnip.resetRunState()` in state.js sets `state.input.drag = null` and `state.input.dragCurrent = null`. This is added to the resetRunState() contract below.

**Flag 10 — Explosive + normal ball same-frame collision priority**
Decision: When multiple balls hit the cat in the same frame and `catHitThisFrame` would cap at 1, **explosive takes priority** if it detonated this frame (i.e., the explosion zone overlap test fires in the same frame as a normal ball hit). Implementation: `checkCollisions()` processes explosive detonation results first in its loop ordering; once `catHitThisFrame = true` is set by an explosive, subsequent normal ball hits in the same frame are skipped for score/coin. This tie-break is documented in the physics.js and powerups.js function contracts below.

---

## 1. File List, Exports, Dependencies, and Source Mapping

Each file is an IIFE that asserts its prerequisites exist on `window.Catnip` before proceeding.
All files use classic `<script>` tags (no `type="module"`). `window.Catnip` is the single shared namespace.

---

### 1. `js/constants.js` — Load position: 1

**Reads from Catnip:** nothing (no dependencies)
**Exports to `window.Catnip`:** `Catnip.constants` (Object.freeze'd)

Exports:
```
Catnip.constants.W                        // 1000
Catnip.constants.H                        // 700
Catnip.constants.CAT_RADIUS               // 24
Catnip.constants.CAT_INITIAL_SPEED        // 180
Catnip.constants.CAT_SPEED_MULTIPLIER     // 1.18
Catnip.constants.CAT_MAX_SPEED            // 540
Catnip.constants.BALL_RADIUS              // 8
Catnip.constants.BALL_MAX_SPEED           // 700
Catnip.constants.BALL_MAX_DRAG            // 200
Catnip.constants.BALL_MIN_DRAG            // 20
Catnip.constants.BALL_DECAY_EARLY         // 0.92
Catnip.constants.BALL_DECAY_LATE          // 0.55
Catnip.constants.BALL_MIN_SPEED           // 80
Catnip.constants.GUIDE_MAX_BOUNCES        // 5
Catnip.constants.INITIAL_BALLS            // 5
Catnip.constants.BALLS_PER_HIT            // 2
Catnip.constants.WALL_THICKNESS           // 8
Catnip.constants.THROWER_X                // W / 2
Catnip.constants.THROWER_Y                // H / 2
Catnip.constants.THROWER_RADIUS           // 18
Catnip.constants.STAR_COUNT               // 18
Catnip.constants.STAR_COLORS              // ['#00f5ff', ...]
Catnip.constants.GameState                // { MENU, PLAYING, SETTINGS, GUIDE, STORE }
// New for expansion:
Catnip.constants.BUMPER_RADIUS            // 18
Catnip.constants.PARTICLE_POOL_MAX        // 200
Catnip.constants.TRAIL_RING_LENGTH        // 12
Catnip.constants.POWERUP_UNLOCK_EXPLOSIVE // 10
Catnip.constants.POWERUP_UNLOCK_MULTIBALL // 25
Catnip.constants.POWERUP_UNLOCK_MAGNET    // 50
Catnip.constants.ABILITY_TIER_SHIELD      // 2.0
Catnip.constants.ABILITY_TIER_DASH        // 2.5
Catnip.constants.ABILITY_TIER_TELEPORT    // 2.9
Catnip.constants.ABILITY_DURATION_SHIELD  // 4000 (ms)
Catnip.constants.ABILITY_DURATION_DASH    // 500
Catnip.constants.ABILITY_DURATION_TELEPORT// 300
Catnip.constants.ABILITY_COOLDOWN_SHIELD  // 12000
Catnip.constants.ABILITY_COOLDOWN_DASH    // 8000
Catnip.constants.ABILITY_COOLDOWN_TELEPORT// 15000
```

**Moving from index.html:** All `const W`, `const H`, `const CAT_RADIUS`, ... top-of-script constants (lines 47–66). `const GameState = { ... }` (lines 85–91). Star-field seed arrays (lines 135–143). All new expansion constants added here.

---

### 2. `js/state.js` — Load position: 2

**Reads from Catnip:** `Catnip.constants`
**Exports to `window.Catnip`:** `Catnip.state`, `Catnip.resetRunState()`

Exports:
```
Catnip.state.persistent   // loaded/saved by store.js; default values:
  .version          // 1
  .coins            // 0
  .lifetimeCoins    // 0
  .highScore        // 0
  .isMuted          // false
  .unlockedIds      // ['cat-default', 'ball-default', 'arena-default']
  .equipped
    .catSkinId      // 'cat-default'
    .ballSkinId     // 'ball-default'
    .arenaId        // 'arena-default'
    .artifactId     // null

Catnip.state.run          // reset on each new game
  .cat              // null until resetRunState()
  .activeBalls      // []
  .score            // 0
  .ballsRemaining   // 0
  .gameOver         // false
  .catHitFlash      // 0
  .catHitThisFrame  // false  — reset to false at TOP of frame() BEFORE physics (Beast flag 2)
  .completionBonusAwarded // false — guard against double-award of +5 game-over bonus (Beast flag 5)
  .guideDashOffset  // 0
  .comboPopups      // []
  .particles        // []
  .screenShake      // 0
  .bumpers          // []
  .powerupQueue     // []  (string[], length 5)
  .pendingAudio     // []  (audio event names; physics pushes, audio.js drains)

Catnip.state.input
  .drag             // null | { x, y }
  .dragCurrent      // null | { x, y }

Catnip.state.ui
  .currentState     // GameState value, starts 'menu'
  .menuFocusIndex   // 0
  .menuHoverIndex   // -1
  .menuButtons      // []
  .backButtonRect   // null
  .backHover        // false
  .muteBtnHover     // false
  .storeScroll      // 0
  .hoveredItemId    // null
  .focusedTab       // 'cats'
  .toast            // null | { text, color, untilTime }
  .storeLayout      // null (computed by render, used by input hit-testing)

Catnip.resetRunState()    // resets state.run AND state.input.drag/dragCurrent to null (Beast flag 9)
                          // clears: cat, activeBalls, score, ballsRemaining, gameOver,
                          //         catHitFlash, catHitThisFrame, completionBonusAwarded,
                          //         comboPopups, particles, screenShake, bumpers, powerupQueue,
                          //         pendingAudio, drag, dragCurrent, all ability cooldowns
```

**Moving from index.html:** Variable declarations on lines 92–109 (`let currentState`, `let cat`, `let activeBalls`, `let score`, `let ballsRemaining`, `let gameOver`, `let drag`, `let dragCurrent`, `let catHitFlash`, `let guideDashOffset`, `let comboPopups`, `let particles`, `let screenShake`). Menu state variables lines 107–109. `isMuted` moves to `state.persistent.isMuted` (was `localStorage.getItem('catnip_muted')`). `resetGame()` (lines 145–163) becomes `Catnip.resetRunState()`.

---

### 3. `js/catalog.js` — Load position: 3

**Reads from Catnip:** `Catnip.constants`
**Exports to `window.Catnip`:** `Catnip.catalog` (Object.freeze'd)

Exports:
```
Catnip.catalog.cats        // CatSkin[]  — empty array in Phase 1; populated Task 3.1
Catnip.catalog.balls       // BallSkin[]
Catnip.catalog.arenas      // Arena[]
Catnip.catalog.artifacts   // Artifact[]
```

Schema (each item type):
```
CatSkin:  { id, name, price, milestone?, palette: { bodyColor, outlineColor, earInnerColor, eyeColor, accessory? } }
BallSkin: { id, name, price, palette: { fillColor, strokeColor, glowColor, trailColor } }
Arena:    { id, name, price, palette: { bgColor, gridColor, wallHue }, bumperLayout: { count, zones, movingCount } }
Artifact: { id, name, price, milestone?, effect: { type, value } }
```

**Moving from index.html:** Nothing in v1. All catalog data is new for the expansion. Phase 1 ships empty arrays.

---

### 4. `js/entities.js` — Load position: 4

**Reads from Catnip:** `Catnip.constants`, `Catnip.catalog`, `Catnip.state`
**Exports to `window.Catnip`:** `Catnip.entities`

Exports:
```
Catnip.entities.makeCat()                          → cat object
Catnip.entities.makeBall(x, y, vx, vy, type)      → ball object (type: 'normal'|'explosive'|'multiball'|'magnet')
                                               //   fields: { x, y, vx, vy, type, bounces: 0, trail: [],
                                               //             shieldReflectCount: 0 }
                                               //   'bounces' is canonical (NOT bounceCount) — Beast flag 1
                                               //   shieldReflectCount per-ball, independent — Beast flag 4
Catnip.entities.makeBumper(x, y, motion)           → bumper object
Catnip.entities.makeParticle(x, y, vx, vy, r, color) → particle object
Catnip.entities.spawnBumpers(state)                → mutates state.run.bumpers
                                               //   max 500 placement attempts per bumper;
                                               //   fallback: zone center clamped to exclusion boundary
                                               //   (Beast flag 6 — no infinite loop risk)
Catnip.entities.spawnHitParticles(x, y, state)     → pushes into state.run.particles (FIFO cull at PARTICLE_POOL_MAX)
```

**Moving from index.html:** `spawnHitParticles()` (lines 977–997). Star field initialisation (lines 136–143) moves here as `Catnip.entities.initStars()`. `buildMenuButtons()` (lines 111–127) moves here as `Catnip.entities.buildMenuButtons(state)`. Ball factory logic extracted from pointerup handler (lines 1261–1270).

---

### 5. `js/physics.js` — Load position: 5

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.entities`
**Exports to `window.Catnip`:** `Catnip.physics`

Exports:
```
Catnip.physics.updateCat(cat, state, dt)
Catnip.physics.stepBall(ball, state, dt)          // pushes 'bounce' onto state.run.pendingAudio
Catnip.physics.updateBalls(state, dt)
Catnip.physics.checkCollisions(state)             // pushes 'catHit' onto pendingAudio; enforces catHitThisFrame cap
                                               //   tie-break: explosive detonations processed first;
                                               //   once catHitThisFrame=true, normal balls skip score/coin
                                               //   (Beast flag 10)
Catnip.physics.updateBumperPhysics(state, dt)
Catnip.physics.updateParticles(state, dt)
Catnip.physics.updateComboPopups(state, dt)
Catnip.physics.computeTrajectory(startX, startY, vx, vy, maxBounces) → point[]
```

No direct audio calls — all audio queued via `state.run.pendingAudio[]`.

**Moving from index.html:** `updateCat()` (lines 775–786), `stepBall()` (lines 788–831, refactored to queue audio), `updateBalls()` (lines 833–855), `checkCollisions()` (lines 857–900, refactored to queue audio and enforce catHitThisFrame), `updateComboPopups()` (lines 902–909), `updateParticles()` (lines 999–1008), `computeTrajectory()` (lines 354–400).

---

### 6. `js/powerups.js` — Load position: 6

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.entities`
**Exports to `window.Catnip`:** `Catnip.powerups`

Exports:
```
Catnip.powerups.rollQueue(state)               → populates state.run.powerupQueue (5 slots)
Catnip.powerups.refillQueue(state, count)      → pushes `count` new entries onto queue tail
Catnip.powerups.handleExplosive(ball, state)   → detonates; pushes 'powerup' onto pendingAudio
Catnip.powerups.handleMultiball(ball, state)   → spawns 3 child balls; pushes 'powerup' onto pendingAudio
                                               //   called AFTER stepBall() increments ball.bounces (Beast flag 3)
Catnip.powerups.applyMagnetSteering(ball, cat, dt) → mutates ball velocity in-place
Catnip.powerups.updateExplosionZones(state, dt) → ages active zones, tests cat overlap
```

**Moving from index.html:** Nothing in v1 (all new expansion logic).

---

### 7. `js/abilities.js` — Load position: 7

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.catalog`
**Exports to `window.Catnip`:** `Catnip.abilities`

Exports:
```
Catnip.abilities.updateAbilities(state, dt)       → tick timers; trigger/defer abilities; push pendingAudio
Catnip.abilities.applyEquippedArtifact(state)     → effect.type switch dispatcher (no function ptrs in catalog)
Catnip.abilities.getEffectiveStartingBalls(state) → INITIAL_BALLS + artifact bonus
Catnip.abilities.getEffectiveCatSpeedCap(state)   → CAT_MAX_SPEED or artifact cap
Catnip.abilities.getCoinBonus(state)              → extra coins per cat hit from artifact
```

**Moving from index.html:** Nothing in v1 (all new expansion logic).

---

### 8. `js/render.js` — Load position: 8

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.catalog`
**Exports to `window.Catnip`:** `Catnip.render`

**Owner: Storm.** Wolverine must not modify draw functions in this file.

Exports:
```
Catnip.render.buildPalette(state)                 → palette object; recomputed once per frame
Catnip.render.drawBackground(ctx, now, palette)
Catnip.render.drawWalls(ctx, now, palette)
Catnip.render.drawBumpers(ctx, state, palette)
Catnip.render.drawThrower(ctx)
Catnip.render.drawAimGuide(ctx, state)
Catnip.render.drawBall(ctx, ball, palette)
Catnip.render.drawCat(ctx, cat, state, palette)
Catnip.render.drawParticles(ctx, state)
Catnip.render.drawComboPopups(ctx, state)
Catnip.render.drawHUD(ctx, state)
Catnip.render.drawGameOver(ctx, state)
Catnip.render.drawMenu(ctx, state, now)
Catnip.render.drawSettings(ctx, state, now)
Catnip.render.drawGuide(ctx, state, now)
Catnip.render.drawStore(ctx, state)
Catnip.render.drawMuteButton(ctx, state)
```

**Moving from index.html:** `drawCat()` (lines 167–286), `drawBall()` (lines 288–327), `drawThrower()` (lines 329–352), `drawAimGuide()` (lines 402–461), `drawHUD()` (lines 463–484), `drawGameOver()` (lines 486–515), `drawMenu()` (lines 624–682), `drawSettings()` (lines 684–731), `drawGuide()` (lines 733–771), `drawBackground()` (lines 1010–1051), `drawWalls()` (lines 1053–1077), `drawComboPopups()` (lines 911–960), `drawParticles()` (lines 962–975), `drawBackButton()` (lines 540–560), `drawMuteButton()` (lines 562–622).

---

### 9. `js/store.js` — Load position: 9

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.catalog`
**Exports to `window.Catnip`:** `Catnip.store`

Exports:
```
Catnip.store.loadState()        → reads localStorage 'catnip:save:v1'; validates; merges into state.persistent
Catnip.store.saveState()        → serialises state.persistent to localStorage; try/catch all I/O
Catnip.store.buy(id, state)     → deducts coins; adds to unlockedIds; saveState(); sets toast
Catnip.store.equip(id, state)   → sets equipped.* field; saveState(); sets toast
```

Storage key: `catnip:save:v1`. All reads/writes wrapped in try/catch. QuotaExceededError logs warning and continues with in-memory state.

**Moving from index.html:** `isMuted` localStorage read (line 104, `localStorage.getItem('catnip_muted')`) moves into `loadState()`. `toggleMute()` (lines 533–538) moves here, calling `saveState()`.

---

### 10. `js/audio.js` — Load position: 10

**Reads from Catnip:** `Catnip.state`
**Exports to `window.Catnip`:** `Catnip.audio`

**Note:** This is the 12th file, added per plan Task 1.5. If Cerebro wants to merge audio into store.js or game.js, that is the only design question requiring a decision.

Exports:
```
Catnip.audio.init()                          → creates AudioContext + masterGain; idempotent
Catnip.audio.drainPendingAudio(state)        → dispatches state.run.pendingAudio[] events; clears array
Catnip.audio.playLaunch()
Catnip.audio.playBounce()
Catnip.audio.playCatHit(bounces)
Catnip.audio.playGameOver()
Catnip.audio.playPowerUp()
Catnip.audio.playBumperHit()
Catnip.audio.playAbilityTone(index)          // 0=shield 400Hz, 1=dash 600Hz, 2=teleport 800Hz
Catnip.audio.playPurchaseChime()
Catnip.audio.setMuted(isMuted)
```

**Moving from index.html:** `initAudio()` (lines 1081–1088), `playLaunch()` (lines 1090–1101), `playBounce()` (lines 1103–1114), `playCatHit()` (lines 1116–1128), `playGameOver()` (lines 1130–1143). `audioCtx`, `masterGain` variables (lines 103–104) move here as module-private.

---

### 11. `js/input.js` — Load position: 11

**Reads from Catnip:** `Catnip.constants`, `Catnip.state`, `Catnip.store`, `Catnip.audio`
**Exports to `window.Catnip`:** `Catnip.input`

Exports:
```
Catnip.input.init(canvas)    → attaches all event listeners; called once from game.js boot
```

Mutates `state.input` and `state.ui`. Dispatches state transitions by writing `state.ui.currentState`. Calls `Catnip.audio.init()` on first interaction.

**Moving from index.html:** All event listeners: `pointerdown` (lines 1147–1160), `pointermove` (lines 1162–1194), `pointerup` (lines 1196–1275), `pointercancel` (lines 1277–1280), `pointerleave` (lines 1282–1286), `keydown` (lines 1288–1328). `handleMenuSelect()` (lines 519–531) becomes a module-private helper inside input.js.

---

### 12. `js/game.js` — Load position: 12

**Reads from Catnip:** all namespaces (final in load order; asserts every one exists)
**Exports to `window.Catnip`:** `Catnip.start()`

Exports:
```
Catnip.start()    → asserts all Catnip.* namespaces present; calls loadState(); builds menu;
                    calls resetRunState(); calls input.init(canvas); kicks off rAF loop
```

`frame(now)` is module-private. Per frame it:
1. Computes `dt` (capped 33ms)
2. Dispatches to active `state.ui.currentState` update branch
3. Calls `Catnip.audio.drainPendingAudio(state)` once
4. Calls `Catnip.render.*` draw functions

**Moving from index.html:** `let lastTime` (line 1332), `frame(now)` (lines 1334–1410), boot block (lines 1413–1415). Canvas setup (lines 69–77) stays in `index.html` `<script>` preamble block or moves here — to be decided.

---

## 2. Load-Order DAG

```
constants.js  (no deps)
     │
     ├──► state.js       (reads: constants)
     │         │
     │         └──► [used by all below]
     │
     ├──► catalog.js     (reads: constants)
     │         │
     │         └──► [used by entities, abilities, render, store]
     │
     ├──► entities.js    (reads: constants, catalog, state)
     │         │
     │         ├──► physics.js    (reads: constants, state, entities)
     │         │         │
     │         │         └──► powerups.js  (reads: constants, state, entities)
     │         │                   │
     │         │                   └──► abilities.js (reads: constants, state, catalog)
     │         │
     │         └──► render.js     (reads: constants, state, catalog)
     │
     ├──► store.js       (reads: constants, state, catalog)
     │
     ├──► audio.js       (reads: state)
     │
     ├──► input.js       (reads: constants, state, store, audio)
     │
     └──► game.js        (reads: ALL — final, boots the game)
```

---

## 3. `<script>` Tag List for `index.html`

```html
<!-- LOAD ORDER (see .cerebro/notepads/catnip-expansion/module-boundary.md for DAG) -->
<script src="js/constants.js"></script>
<script src="js/state.js"></script>
<script src="js/catalog.js"></script>
<script src="js/entities.js"></script>
<script src="js/physics.js"></script>
<script src="js/powerups.js"></script>
<script src="js/abilities.js"></script>
<script src="js/render.js"></script>
<script src="js/store.js"></script>
<script src="js/audio.js"></script>
<script src="js/input.js"></script>
<script src="js/game.js"></script>
```

---

## 4. Prerequisite Assertion Pattern

Each file's IIFE begins with assertions before any other code:

```js
(function () {
  if (!window.Catnip) throw new Error('catnip: window.Catnip missing — load constants.js first');
  if (!window.Catnip.constants) throw new Error('catnip: Catnip.constants missing — load constants.js before this file');
  // additional assertions per file's dependency list
  // ... file body
}());
```

---

## 5. File Ownership Summary

| # | File | Owner |
|---|---|---|
| 1 | `js/constants.js` | Wolverine |
| 2 | `js/state.js` | Wolverine |
| 3 | `js/catalog.js` | Wolverine |
| 4 | `js/entities.js` | Wolverine |
| 5 | `js/physics.js` | Wolverine |
| 6 | `js/powerups.js` | Wolverine |
| 7 | `js/abilities.js` | Wolverine |
| 8 | `js/render.js` | **Storm** (all draw functions — Wolverine must not modify) |
| 9 | `js/store.js` | Wolverine (save/load/buy/equip); Storm adds `drawStore` inside render.js |
| 10 | `js/audio.js` | Wolverine |
| 11 | `js/input.js` | Wolverine |
| 12 | `js/game.js` | Wolverine |

---

## 6. Open Question for Cerebro

**audio.js as file 12 vs 11:** The task description says "11-file layout" but the plan (Task 1.5) explicitly creates `js/audio.js` as a separate file. This document covers 12 files. If Cerebro wants to merge audio functions into `js/game.js` or `js/store.js` to keep it at 11, the document will be updated. Otherwise, treat 12 as the approved count.

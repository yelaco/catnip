# Catnip Expansion: Coins, Store, Power-ups, Abilities, and Bumpers

**Objective:** Expand Catnip from a single-file slingshot game into a modular, persistent, content-rich browser game featuring a coin/store economy, cosmetics (cat skins, ball skins, arena themes, artifacts), power-up balls (explosive, multi-ball, magnet), arena bumpers, and tier-triggered cat abilities (shield, dash, teleport), while preserving zero-build, file://-runnable, zero-dependency UX.
**Risk Level:** HIGH

## Assumptions and Decisions

- **Module system: classic `<script>` tags + `window.Catnip` namespace.** ES modules require an HTTP server (CORS on file://); the "open index.html and play" promise is load-bearing. (per forge-architecture)
- **Shared state: single `window.Catnip` global with sub-objects** (`constants`, `catalog`, `state.persistent`, `state.run`, `state.input`, `state.ui`). `constants` and `catalog` are `Object.freeze`d at boot.
- **Persistence: a single versioned localStorage JSON blob** under key `catnip:save:v1`. Schema includes `{ version, coins, lifetimeCoins, unlockedIds[], equipped{}, highScore }`. All writes go through a single `saveState()`; all reads through a single `loadState()` bootstrap with defensive defaults and validation.
- **All persistence read/write is wrapped in try/catch.** On `QuotaExceededError`, `SecurityError`, JSON parse errors, or schema corruption, the game falls back to default in-memory state and continues running — no crash.
- **`loadState()` validates equipped IDs against unlocked set.** If `equipped.artifactId`, `equipped.catSkinId`, `equipped.ballSkinId`, or `equipped.arenaId` references an item not in `unlockedIds`, that slot is silently reset to the default (or `null` for artifact).
- **Coin sources are exhaustively defined:** +1 coin per cat hit, +1 coin per bumper hit, +5 coin completion bonus on game over (`balls === 0 && activeBalls === 0`). Score-to-coin conversion is removed in favor of this granular model. Per-frame coin payout is capped (see multi-ball decision below).
- **Per-frame cat-hit cap.** A maximum of one cat hit is scored per frame across all active balls (coin + score awarded once); additional balls that collide with the cat in the same frame still despawn (and explosives still detonate visually) but yield no additional score/coin. Prevents 3× multi-ball payout exploits.
- **Game-over routes to MENU, not directly back to PLAY.** This lets the player spend coins, change equipment, or quit before the next run. R or click on the game-over overlay returns to MENU.
- **Game-over does not trigger while any ball — including power-up balls — is still in flight.** Power-up balls are regular `activeBalls[]` entries. The existing condition `ballsRemaining === 0 && activeBalls.length === 0` is preserved.
- **Power-up ball type is decoupled from ball skin.** `ball.type` is a mechanic; `ballSkinId` is a cosmetic. No pay-to-win.
- **Power-up unlock gating by lifetime score:** explosive ≥ 10, multi-ball ≥ 25, magnet ≥ 50. Below the gate, queue slots roll into `normal`. Spawn distribution once all unlocked: 70% normal / 12% explosive / 10% multi-ball / 8% magnet.
- **Cat shield is the canonical anti-power-up interaction.** While shield is active: normal/multi-ball/magnet balls **reflect** off the shield (no score, no coin awarded; `ball.bounceCount += 1` so they still expire after 3 reflections). Explosive balls **still detonate on shield contact** but award no score/coin and the radial test against the shielded cat is ignored. Magnet steering force continues to apply during shield (the shield reflects on contact, not before).
- **Cat abilities are speed-tier triggered, with independent cooldowns:** Tier 2 (≥2× initial speed) → SHIELD 4s / cooldown 12s; Tier 2.5× → DASH 0.5s ×2.5 speed / cooldown 8s; Tier 2.9× → TELEPORT 0.3s fade then random valid spot / cooldown 15s. `speedTier` is monotonic per run; cooldowns let abilities re-trigger. Only one `activeAbility` at a time; competing triggers are deferred until current ability ends.
- **Cat clone is NOT in scope.** Original brief mentioned clone-at-3× as one of three abilities; we replace it with **teleport** (a simpler, single-entity behavior). This avoids the multi-entity collision/scoring interaction matrix Beast flagged. Documented here as a scope reduction.
- **Bumper-vs-ball collision counts toward the 3-bounce expiry** (`ball.bounceCount += 1`) and awards +1 coin only (no score). Reflection uses `vNew = v − 2(v·n)n` with a 1.05× restitution multiplier, speed capped at 1000 px/s. Ejection epsilon 0.5 px prevents stuck-inside flicker.
- **Bumpers are ball-solid only — cats pass through bumpers.** Avoids cat-trap edge cases entirely.
- **Power-up balls obey artifact effects unless explicitly stated.** `artifact-iron-claw` (+1 starting ball) applies to all ball types. `artifact-lucky-paw` (+1 coin per cat hit) applies only to legitimate cat-hit coin payouts (not bumper hits, not explosive shield hits). `artifact-slow-mo` (cat speed cap ×2.5) caps cat speed regardless of ball type or ability.
- **Sound effects use the existing Web Audio synth pattern** (no audio files). Four new sounds: power-up activation (sine sweep 300→800 Hz), bumper hit (white-noise highpass click), ability activation (3 distinct square-wave tones), purchase chime (C-major arpeggio). All routed through existing `masterGain` and respect `isMuted`.
- **Catalog content for v2 launch:** 4 cat skins, 4 ball skins, 3 arenas, 3 artifacts (full list in `js/catalog.js`, prices and milestones documented).
- **No new tests; no test harness exists.** Verification is manual browser testing per acceptance criterion.
- **Catalog effects are dispatched by `effect.type` switch in `js/abilities.js`** — no function pointers stored in catalog data. Keeps catalog JSON-serializable and editable.
- **Particle and trail allocation is pool-backed.** Global cap 200 particles (FIFO cull); trail arrays ring-buffered at 12 positions. Prevents GC hitches on multi-ball + magnet + bumper-heavy frames.
- **Phase 1 file split is gated by Cerebro approval of the exact module boundary.** No file is created or `index.html` modified until Cerebro approves the file list, exports, and `<script>` load order.

## Non-Goals

- No real money, no payments, no monetization of any kind.
- No server-side state; no accounts; no leaderboards. localStorage only.
- No automated test suite, no CI, no linter introduction.
- No TypeScript, no bundler, no npm/yarn/pnpm, no build step.
- No multiplayer or co-op.
- No mobile/touch input changes beyond what existing pointer events already provide.
- No new audio assets (all SFX remain procedurally synthesized via Web Audio API).
- No ES modules (would break file:// loading).
- No cat clone ability (replaced with teleport; see Assumptions).
- No new entity types beyond cat, ball (with `type` discriminator), bumper, and particle.
- No procedurally generated content (arena bumper placements are randomized within hand-defined zones, not freely generated).

## Approval Gates

- [ ] **Pre-Phase-1 git/file checkpoint.** Before Phase 1 modifies `index.html`, a working snapshot of `index.html` is copied to `index.html.v1-backup` (or, if the project becomes a git repo by then, a tag `v1-pre-split` is created). This is a non-destructive checkpoint and serves as the rollback target. Gate applies to Task 1.0.
- [ ] **File-split structure approval.** Before any file is created or `index.html` is modified in Phase 1, Cerebro must approve the exact `js/*.js` file list, the public exports each file places on `window.Catnip`, the import dependencies between files, and the `<script>` tag load order to be placed in `index.html`. Deliverable to Cerebro: a textual module-boundary document (file → exports → reads-from-Catnip namespaces) plus the proposed load-order DAG. Gate applies to Task 1.1 and blocks Tasks 1.2–1.7 until lifted.
- [ ] **Store UI mockup approval.** Before Phase 8 begins implementing draw functions, Storm produces a low-fidelity canvas mockup of the store screen (layout: top bar with coin balance, tab strip for Cats/Balls/Arenas/Artifacts, 3×2 card grid with previews, footer Buy/Equip/Equipped buttons, toast region, back button) and Cerebro approves. Gate applies to Task 8.1 and blocks Tasks 8.2–8.5.

## Acceptance Criteria

**File structure & boot (Phase 1):**
- [ ] `index.html` loads from a `file://` URL with no JavaScript errors in the browser console. All `<script>` tags are classic (no `type="module"`).
- [ ] Opening `index.html` produces the v1 menu screen and a click-through to gameplay is functionally identical to pre-split behavior (same physics, same scoring, same audio).
- [ ] Each `js/*.js` file's dependency assertion fails loudly with a descriptive `Error` if its prerequisites are missing.

**Coin economy & persistence (Phase 2):**
- [ ] Coin balance is visible on the HUD at all times during PLAY state.
- [ ] Cat hit awards exactly +1 coin (or +2 with `artifact-lucky-paw` equipped). Bumper hit awards +1 coin. Game over awards +5 coin completion bonus.
- [ ] Coins persist across browser close and reopen.
- [ ] Clearing localStorage entirely and reloading the page produces a clean default state (coins=0, only default skins/arena unlocked) with no JS errors and no `NaN` values anywhere in state.
- [ ] If `localStorage` is unavailable (private mode, security policy), the game starts and plays normally with in-memory state — no crash, no error dialog.
- [ ] If the save blob is corrupted (malformed JSON, missing required fields, non-numeric coins), it is replaced with defaults silently on load.

**Catalog & store (Phase 3 + 8):**
- [ ] `js/catalog.js` exports 4 cat skins, 4 ball skins, 3 arenas, and 3 artifacts, each with the schema defined in forge-architecture's report.
- [ ] Store screen is navigable both with mouse (click cards/tabs/buttons) and keyboard (arrow keys + Enter for tab/card focus, Esc to back to menu) consistent with existing menu navigation.
- [ ] Attempting to purchase an item with insufficient coins shows a visible error state (Buy button disabled and grayed when funds < price; if clicked anyway, no coin deduction occurs and no purchase event fires).
- [ ] Purchasing an item deducts the exact price, adds the item to `unlockedIds`, and persists immediately.
- [ ] Equipping a different cat skin changes the rendered cat visual on the very next PLAY entry. Equipped state persists across reload.
- [ ] If `equipped.artifactId` (or any equipped slot) references an item not in `unlockedIds`, that slot is silently reset on load and the game starts with the default for that slot (artifact → `null`).

**Skin rendering (Phase 4):**
- [ ] The currently equipped cat skin, ball skin, and arena theme all visually render correctly during gameplay (palette object injection drives all colors).
- [ ] Switching between any two cat skins shows a visible change in `bodyColor`, `outlineColor`, `earInnerColor`, and `eyeColor` on the next frame after equip.
- [ ] Ball trails inherit `trailColor` from the equipped ball skin (or render no trail when `trailColor === null`).

**Power-up balls (Phase 5):**
- [ ] At game start, the power-up queue holds 5 ball types reflecting current unlock gates. Queue is visible as 5 small icons on the HUD.
- [ ] Throwing a multi-ball results in three independently-physics-simulated `normal` balls at ±15° from the parent velocity at 80% speed, spawned at the parent's first wall bounce. Each child is rendered with the equipped ball skin.
- [ ] A magnet ball measurably curves toward the cat during flight (acceleration toward cat = 600 px/s²; visible deflection within ~0.5s of flight). Speed is clamped at 900 px/s. Magnet expires after 1 wall bounce.
- [ ] An explosive ball, on cat hit or 3rd-bounce expiry, spawns a visible expanding radial-ring effect (radius 80 for 100ms) plus particle burst. If the cat overlaps in that window, +1 score and +2 coins are awarded (explosive radial bonus counts as the one allowed hit for that frame per the per-frame cap). Plays power-up activation sound.
- [ ] All 3 children of a multi-ball hitting the cat in the same frame yield exactly +1 score and +1 coin total (per-frame cap), and all 3 balls despawn cleanly.
- [ ] Power-up balls never cause `activeBalls.length` to lag behind the actual ball count; the game-over check works correctly for power-up balls.

**Bumpers (Phase 6):**
- [ ] Each arena spawns the correct number of bumpers (default: 3, cosmos: 5 with 2 moving, dojo: 4 with 1 moving) within defined zones, respecting min spacing 4× radius and 100px exclusion around thrower and cat spawn.
- [ ] Balls colliding with a bumper reflect at the correct angle (`v − 2(v·n)n` with 1.05× restitution) and `bounceCount` increments by 1.
- [ ] Bumper hit awards +1 coin (and no score) and plays the bumper-hit sound.
- [ ] Moving bumpers (linear: 60 px/s axis-bouncing; orbit: 50 px radius, 0.8 rad/s) do not jitter, do not vanish, and do not collide with each other.
- [ ] The cat passes through bumpers without trigger (bumpers are ball-solid only).
- [ ] A bumper hit-flash (yellow pulse 150ms) is visible on impact.

**Cat abilities (Phase 7):**
- [ ] At cat speed ≥ 2× initial, shield activates: a translucent halo at radius `cat.r + 8` is visible for 4s; balls reflecting off it do not award score/coin and increment `bounceCount`.
- [ ] At cat speed ≥ 2.5× initial (with shield not active or just ended), dash activates: cat velocity rotates to a random angle and scales by 2.5× for 0.5s, then settles back. Cooldown 8s prevents immediate re-trigger.
- [ ] At cat speed ≥ 2.9× initial, teleport activates: cat fades out 0.3s, reappears at a random valid arena position (not inside a wall or bumper). Cooldown 15s.
- [ ] Only one ability is active at a time. When shield is active and dash threshold trips, dash is deferred until shield ends.
- [ ] Restarting the game (R key, game-over overlay) resets all ability cooldowns and `speedTier` to 0.
- [ ] An ability activation plays the corresponding square-wave tone (400/600/800 Hz for shield/dash/teleport).
- [ ] Speed oscillating exactly at a tier boundary does not re-trigger the same ability multiple times per second (tier abstraction prevents this).

**Combinatorial interactions (Phase 9):**
- [ ] Cat shield + magnet ball: ball curves toward cat (steering still applied), but on contact reflects (no score/coin, `bounceCount += 1`).
- [ ] Explosive ball + `artifact-lucky-paw`: explosive cat-hit yields +1 score and +3 coins (base +2 from explosive plus +1 from artifact).
- [ ] Multi-ball children obey artifact effects identically to thrown normal balls.
- [ ] Game-over does not appear while any power-up ball or any multi-ball child is still in flight.
- [ ] Pause (P key) and unpause works during any combination of active abilities, power-up balls, and moving bumpers.

**Persistence integrity (always-on):**
- [ ] Coin balance, unlocked items, equipped items, and high score all persist across browser close, reopen, and reload.
- [ ] Manually editing localStorage to set `coins: "not a number"`, `coins: -5`, or `coins: null` causes `loadState()` to clamp/reset to a valid default (>= 0 integer) without crashing.
- [ ] Manually adding a non-existent item ID to `unlockedIds` does not crash the store screen; the bogus ID is filtered out on load.

## Tasks

### Task 1.0: Create rollback checkpoint

**Owner:** Wolverine
**Files:** `index.html.v1-backup` (create as exact copy of current `index.html`)
**What:** Copy current `index.html` to `index.html.v1-backup` as a non-destructive rollback target. If the project is in a git repo at execution time, additionally create a tag `v1-pre-split` on the current commit. Document the checkpoint path in `.cerebro/notepads/catnip-expansion/verification.md`.
**TDD:** Not applicable: mechanical filesystem operation, no test harness exists.
**Verify:** `ls -la index.html.v1-backup` shows file exists; `diff index.html index.html.v1-backup` produces no output.
**Risk:** LOW
**Approval Gate:** Pre-Phase-1 git/file checkpoint

### Task 1.1: Define and approve file-split module boundary

**Owner:** Wolverine (drafts), Cerebro (approves)
**Files:** `.cerebro/notepads/catnip-expansion/module-boundary.md` (create)
**What:** Produce a textual module-boundary document listing each `js/*.js` file, its public exports placed on `window.Catnip`, the `Catnip` sub-namespaces it reads, and the `<script>` tag load order DAG. Use forge-architecture's recommended layout (constants, state, catalog, entities, physics, powerups, abilities, render, store, input, game). Submit to Cerebro for approval before any file is created.
**TDD:** Not applicable: documentation deliverable.
**Verify:** Cerebro explicit approval in `.cerebro/boulder.json` decision log; gate marked checked.
**Risk:** MEDIUM
**Approval Gate:** File-split structure approval

### Task 1.2: Create constants.js, state.js, catalog.js (data-only modules)

**Owner:** Wolverine
**Files:** `js/constants.js` (create), `js/state.js` (create), `js/catalog.js` (create — placeholders)
**What:** Extract all ALL_CAPS constants to `js/constants.js`. Create `js/state.js` exporting the `window.Catnip.state` skeleton with default values. Create `js/catalog.js` exporting empty arrays (populated in Phase 3). Each file's IIFE asserts prerequisites on `window.Catnip` and throws a descriptive `Error` if missing. `Object.freeze` constants at boot.
**TDD:** Not applicable.
**Verify:** Browser console shows no errors. `window.Catnip.constants.W === 1000` and `window.Catnip.state.persistent.coins === 0` in console.
**Risk:** LOW
**Approval Gate:** File-split structure approval (already granted before this task runs)

### Task 1.3: Extract physics.js and entities.js

**Owner:** Wolverine
**Files:** `js/physics.js` (create), `js/entities.js` (create), `index.html` (modify)
**What:** Move `updateCat`, `stepBall`, `updateBalls`, `checkCollisions`, `computeTrajectory`, `spawnHitParticles`, `updateParticles`, `updateComboPopups` into appropriate files. Refactor `stepBall` and `checkCollisions` to collect audio events into `state.run.pendingAudio[]` queue rather than directly calling audio functions. Preserve all v1 physics behavior bit-identical.
**TDD:** Not applicable.
**Verify:** Manual: play through to game-over after split. Cat hits flash; balls bounce; audio plays; collisions and scoring identical to pre-split.
**Risk:** MEDIUM (physics regression risk; audio decoupling is the highest-touch change)
**Approval Gate:** File-split structure approval (already granted)

### Task 1.4: Extract render.js and input.js

**Owner:** Storm (render.js draw functions), Wolverine (input.js handlers and event wiring)
**Files:** `js/render.js` (create), `js/input.js` (create), `index.html` (modify)
**What:** Move all `draw*` functions to `js/render.js`, accepting `(ctx, state)` parameters (no global reads). Move all pointer/keyboard handlers to `js/input.js`, mutating `state.input` and dispatching state transitions via callbacks exported from `game.js`.
**TDD:** Not applicable.
**Verify:** Manual: menu, settings, guide, gameplay, and game-over all render identically to pre-split; all input (mouse drag, arrow nav, R restart, M menu, Esc back) behaves identically.
**Risk:** MEDIUM
**Approval Gate:** File-split structure approval (already granted)

### Task 1.5: Extract audio.js and store.js skeleton

**Owner:** Wolverine
**Files:** `js/audio.js` (create), `js/store.js` (create — skeleton), `index.html` (modify)
**What:** Move `initAudio`, `playLaunch`, `playBounce`, `playCatHit`, `playGameOver`, and the `audioCtx`, `masterGain`, `isMuted` state to `js/audio.js`. Expose `playEvent(eventName)` that the main loop calls to drain `state.run.pendingAudio[]`. Move `isMuted` persistence into placeholder `js/store.js`. All localStorage I/O wrapped in try/catch.
**TDD:** Not applicable.
**Verify:** Manual: all v1 sounds still play. Mute persists across reload. Clearing localStorage and reloading produces no errors.
**Risk:** LOW
**Approval Gate:** File-split structure approval (already granted)

### Task 1.6: Extract game.js (main loop + state machine)

**Owner:** Wolverine
**Files:** `js/game.js` (create), `index.html` (modify — strip all remaining inline JS, leave only `<script>` tag list)
**What:** Move `resetGame`, `frame(now)`, `requestAnimationFrame` boot, and state machine dispatch into `js/game.js`. Last in load order. After load, asserts every other `Catnip.*` namespace is present, then calls `Catnip.start()`.
**TDD:** Not applicable.
**Verify:** From `file://`, `index.html` loads, menu appears, gameplay works through game-over, no console errors.
**Risk:** HIGH (any bug here breaks the game outright; culmination of the split)
**Approval Gate:** File-split structure approval (already granted)

### Task 1.7: Add load-order documentation and prerequisite assertions

**Owner:** Wolverine
**Files:** All `js/*.js` files (modify)
**What:** Every file's IIFE begins with prerequisite assertions that throw descriptive errors if missing prerequisites. Add a `// LOAD ORDER:` comment block to `index.html` listing the DAG above the `<script>` tags.
**TDD:** Not applicable.
**Verify:** Manually reorder one `<script>` tag (e.g., entities.js before constants.js); confirm descriptive error fires in console. Revert.
**Risk:** LOW
**Approval Gate:** File-split structure approval (already granted)

### Task 2.1: Define `state.persistent` schema and `loadState`/`saveState` API

**Owner:** Wolverine
**Files:** `js/store.js` (modify — promote from skeleton to full save/load API)
**What:** Implement `loadState()` and `saveState()` in `js/store.js`. Schema: `{ version: 1, coins: 0, lifetimeCoins: 0, unlockedIds: ['cat-default','ball-default','arena-default'], equipped: { catSkinId: 'cat-default', ballSkinId: 'ball-default', arenaId: 'arena-default', artifactId: null }, highScore: 0, isMuted: false }`. Storage key: `catnip:save:v1`. `loadState()` validates: `coins` must be finite non-negative integer (else 0); `unlockedIds` must be an array of strings containing all 3 defaults; each `equipped` slot must be in `unlockedIds` (else reset to default). All reads/writes wrapped in try/catch. On QuotaExceededError, log warning and continue with in-memory state. Migration stub for future version bumps.
**TDD:** Not applicable.
**Verify:**
  1. Fresh load: `localStorage.getItem('catnip:save:v1')` is a JSON blob matching the default schema.
  2. Set `coins: "banana"` in localStorage, reload: state resets to defaults, no crash.
  3. Set `equipped.artifactId: "nonexistent-id"` in localStorage, reload: `state.persistent.equipped.artifactId === null`, other fields preserved.
  4. `localStorage.clear()` and reload: clean default state, no errors.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 2.2: Coin award hooks and HUD display

**Owner:** Wolverine (logic), Storm (HUD draw)
**Files:** `js/physics.js` (modify), `js/game.js` (modify), `js/render.js` (modify)
**What:** On cat hit (single hit per frame — enforce with `state.run.catHitThisFrame` boolean reset each frame), increment `state.persistent.coins += 1` (or `+= 2` with `artifact-lucky-paw`). On game-over, award +5 completion bonus. Update `state.persistent.lifetimeCoins` (monotonic). Draw coin balance on HUD: top-right corner, `Coins: N`, visible during PLAY.
**TDD:** Not applicable.
**Verify:** Cat hit → coin increments by 1. Three multi-ball children hitting in same frame → +1 coin only. Game over → +5 added, persisted. Reload — coins remain.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 3.1: Populate catalog.js with v2 cosmetic data

**Owner:** Wolverine
**Files:** `js/catalog.js` (modify)
**What:** Populate full v2 catalog:
  - **Cat skins (4):** `cat-default` (free), `cat-tabby` (25 coins), `cat-tuxedo` (50 coins), `cat-void` (200 coins, milestone `lifetimeCoins >= 500`).
  - **Ball skins (4):** `ball-default` (free), `ball-comet` (40), `ball-bubble` (75), `ball-prism` (150).
  - **Arenas (3):** `arena-default` (free), `arena-cosmos` (60, `bumperLayout: { count: 5, zones: [...], movingCount: 2 }`), `arena-dojo` (120, `bumperLayout: { count: 4, zones: [...], movingCount: 1 }`).
  - **Artifacts (3):** `artifact-lucky-paw` (100, `effect: { type: 'coin_per_hit_bonus', value: 1 }`), `artifact-iron-claw` (150, `effect: { type: 'starting_balls_bonus', value: 1 }`), `artifact-slow-mo` (200, `effect: { type: 'cat_speed_cap_multiplier', value: 2.5 }`).
  Catalog is `Object.freeze`d at boot.
**TDD:** Not applicable.
**Verify:** `Object.isFrozen(window.Catnip.catalog)` returns `true`. `window.Catnip.catalog.cats.length === 4`.
**Risk:** LOW
**Approval Gate:** None

### Task 3.2: Effect dispatcher in abilities.js

**Owner:** Wolverine
**Files:** `js/abilities.js` (create)
**What:** Create `js/abilities.js` exporting `Catnip.abilities.applyEquippedArtifact(state)` which reads `state.persistent.equipped.artifactId`, looks it up in catalog, and dispatches via switch on `effect.type`. No function pointers in catalog data — only `{ type, value }`.
**TDD:** Not applicable.
**Verify:** Equip `artifact-iron-claw` → 6 starting balls. Equip `artifact-slow-mo` → cat speed never exceeds 2.5× initial. Equip `artifact-lucky-paw` → each cat hit awards 2 coins.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 4.1: Skin palette parameterization in render.js

**Owner:** Storm
**Files:** `js/render.js` (modify)
**What:** Refactor `drawCat`, `drawBall`, `drawBackground`, and `drawWalls` to accept a `palette` object derived from equipped skins/arena. Replace every hardcoded color literal with a palette field lookup. Helper `Catnip.render.buildPalette(state)` assembles the palette from `state.persistent.equipped` + catalog lookups, recomputed once per frame.
**TDD:** Not applicable.
**Verify:** Equip each of the 4 cat skins — visually confirm body color, outline, ear inner, and eye colors all change. Equip each of the 3 arenas — confirm background, grid tint, and wall hue all change. Equip ball skin with `trailColor: null` — confirm no trail renders.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 4.2: Cat accessory rendering (procedural paths)

**Owner:** Storm
**Files:** `js/render.js` (modify)
**What:** When `palette.cat.accessory` is non-null, draw the named procedural accessory: `bowtie` (two filled triangles), `crown` (filled jagged polygon), `glasses` (two ellipses + bridge line). Position relative to cat center; follows cat through all motion.
**TDD:** Not applicable.
**Verify:** Define one skin with each accessory type — visually confirm on cat. Confirm accessory follows cat through wall bounces and speed changes.
**Risk:** LOW
**Approval Gate:** None

### Task 5.1: Power-up queue and ball type discriminator

**Owner:** Wolverine (logic), Storm (HUD queue icons)
**Files:** `js/state.js` (modify), `js/entities.js` (modify), `js/game.js` (modify), `js/render.js` (modify)
**What:** Add `state.run.powerupQueue: string[]` of length 5. Populate at `resetGame` using spawn distribution filtered by unlock gates (explosive ≥ 10 lifetimeCoins, multiball ≥ 25, magnet ≥ 50). Locked slots roll into `normal`. Add `type` field to Ball entity. On throw, shift head of queue; on `BALLS_PER_HIT` refill, push 2 newly-rolled types onto tail. Render queue as 5 small icons on HUD.
**TDD:** Not applicable.
**Verify:** Fresh game with `lifetimeCoins=0` → queue is all `normal`. After cheat-setting `lifetimeCoins=500`, queue contains a mix of all 4 types. Throw a ball: HUD icons update.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 5.2: Explosive ball behavior

**Owner:** Wolverine (logic), Storm (visual)
**Files:** `js/powerups.js` (create), `js/render.js` (modify)
**What:** On cat hit OR 3rd-bounce expiry, spawn a damage zone at ball position (radius 80, lifetime 100ms). During active window, test cat-circle vs zone; if overlap, award +1 score and +2 coins (subject to per-frame cap — explosive radial bonus counts as the one allowed hit). Render as expanding orange ring + 8-particle burst. Play `playPowerUp` on detonation.
**TDD:** Not applicable.
**Verify:** Explosive hits cat → orange ring, particle burst, +1 score +2 coins. Explosive expires at 3 bounces away from cat → visual ring at expiry point; no score awarded.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 5.3: Multi-ball behavior

**Owner:** Wolverine
**Files:** `js/powerups.js` (modify)
**What:** On multi-ball's first wall bounce, despawn parent and spawn 3 `normal` balls at -15°, 0°, +15° from parent velocity, each at 80% parent speed. Children have fresh `bounceCount: 0`. Play `playPowerUp` on split.
**TDD:** Not applicable.
**Verify:** Throw multi-ball at wall → 3 balls fan out, each follows independent physics. All 3 simultaneously hitting cat in one frame → +1 score +1 coin only.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 5.4: Magnet ball behavior

**Owner:** Wolverine (logic), Storm (visual indicator)
**Files:** `js/powerups.js` (modify), `js/render.js` (modify)
**What:** Per physics step, apply `accel = normalize(cat.pos - ball.pos) * 600` px/s² to ball velocity scaled by `dt`. Clamp resulting speed to ≤ 900 px/s. Magnet converts to normal after 1 wall bounce. Render with small arrow overlay pointing at cat.
**TDD:** Not applicable.
**Verify:** Magnet thrown perpendicular to cat → trajectory visibly curves within ~0.5s. Speed in console never exceeds 900 px/s. After one wall bounce, magnet indicator disappears.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 6.1: Bumper entity and physics

**Owner:** Wolverine
**Files:** `js/entities.js` (modify), `js/physics.js` (modify), `js/game.js` (modify)
**What:** Add `Bumper` factory: `{ id, x, y, r: 18, hue, pulsePhase, hitFlash, motion }` with motion `null | {type:'linear', vx, vy, bounds} | {type:'orbit', cx, cy, radius, omega, theta}`. At PLAY start, read `equipped.arenaId` → `catalog.arenas[id].bumperLayout`, place bumpers in random positions within zones (min spacing 4×r, 100px exclusion around thrower and cat spawn). Moving bumpers per `movingCount`. Collision resolution: eject by 0.5px+, reflect velocity `v − 2(v·n)n` × 1.05 restitution, cap 1000 px/s, `bounceCount += 1`, award +1 coin, spawn 4–6 particles, `bumper.hitFlash = 150ms`, play `playBumperHit`. Cats pass through bumpers without collision test.
**TDD:** Not applicable.
**Verify:** Default arena → 3 bumpers. Cosmos arena → 5 bumpers, 2 visibly moving. Dojo → 4 bumpers, 1 moving. Ball hits bumper → bounce, hit-flash, coin awarded, bounceCount increments. Cat passes through bumpers without bouncing.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 6.2: Bumper rendering

**Owner:** Storm
**Files:** `js/render.js` (modify)
**What:** Draw each bumper as a filled circle with hue per bumper, subtle pulse animation, and bright flash when `hitFlash > 0`. Z-order: arena → walls → bumpers → balls → cat → particles → popups → HUD.
**TDD:** Not applicable.
**Verify:** Bumpers pulse subtly when idle; flash brightly on hit. Z-order correct (cat drawn over bumpers).
**Risk:** LOW
**Approval Gate:** None

### Task 7.1: Cat ability state + speed-tier triggers

**Owner:** Wolverine
**Files:** `js/state.js` (modify), `js/abilities.js` (modify), `js/physics.js` (modify)
**What:** Add to cat state: `initialSpeed`, `speedTier: 0`, `activeAbility: null`, `abilityTimer: 0`, `abilityCooldowns: { shield: 0, dash: 0, teleport: 0 }`. Each frame: compute tier, activate ability if threshold met, cooldown is 0, and no ability active. Tick timers. Shield: Tier ≥2, 4s, cooldown 12s. Dash: speed ≥2.5×, 0.5s ×2.5 velocity at random angle, cooldown 8s. Teleport: speed ≥2.9×, 0.3s fade + reposition to random valid spot, cooldown 15s. Competing ability triggers deferred until current ends. `resetGame` zeros all cooldowns and `speedTier`.
**TDD:** Not applicable.
**Verify:** After ~9 hits, shield halo appears 4s. After ~12 hits, dash triggers. At high speed (>2.9×), cat fades and reappears in new spot. Speed at tier boundary does not spam-trigger ability.
**Risk:** HIGH (most complex mechanic)
**Approval Gate:** None

### Task 7.2: Shield reflection and ball interactions

**Owner:** Wolverine
**Files:** `js/physics.js` (modify), `js/powerups.js` (modify)
**What:** In `checkCollisions`, when `cat.activeAbility === 'shield'`: normal/multi-ball-child/magnet balls reflect (`n = normalize(ball - cat); v -= 2*(v·n)*n`), no score/coin, `bounceCount += 1`. Magnet steering continues; shield reflects on contact. Explosive balls detonate visually but radial test against shielded cat is skipped (no score/coin). Sentinel: if a single ball reflects off shield more than 3 times per shield window, force despawn.
**TDD:** Not applicable.
**Verify:** Shield active → ball thrown at cat reflects, no score. Explosive thrown at shielded cat → explosion plays, no score. Magnet thrown at shielded cat → curves then reflects. Per-shield-window reflect count sentinel tested by cornering a ball geometrically.
**Risk:** HIGH
**Approval Gate:** None

### Task 7.3: Ability visual + audio

**Owner:** Storm (visual), Wolverine (audio wiring)
**Files:** `js/render.js` (modify), `js/audio.js` (modify)
**What:** Storm: Shield → translucent blue halo at radius `cat.r + 8`, oscillating opacity. Dash → short streak/trail during 0.5s window. Teleport → cat fades to alpha 0 over 0.15s, reappears over 0.15s, subtle ring at departure and arrival. Wolverine: implement `playPowerUp`, `playAbilityTone(toneIndex)`, `playBumperHit`, `playPurchaseChime` using synthesis patterns from sage-research. All respect `isMuted`.
**TDD:** Not applicable.
**Verify:** Each ability has distinct visible effect and distinct audible tone. Muting silences all of them.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 8.1: Store UI mockup and approval

**Owner:** Storm (drafts), Cerebro (approves)
**Files:** `.cerebro/notepads/catnip-expansion/store-mockup.md` (create)
**What:** Storm produces a low-fidelity layout: top bar (Coins:N right-aligned), tab strip (Cats | Balls | Arenas | Artifacts), 3×2 card grid with canvas preview + name + price + lock icon, footer Buy/Equip/Equipped✓ button, toast region top-right (2s auto-dismiss), back button. Submit to Cerebro for approval.
**TDD:** Not applicable.
**Verify:** Cerebro approves mockup in decision log.
**Risk:** LOW
**Approval Gate:** Store UI mockup approval

### Task 8.2: Store state machine and navigation

**Owner:** Wolverine
**Files:** `js/state.js` (modify), `js/game.js` (modify), `js/input.js` (modify)
**What:** Add `GameState.STORE`. From MENU, new "Store" button enters STORE. Support: tab navigation (arrows/click), card focus (arrows/hover), Enter/click to Buy or Equip, Esc to return to MENU. Add `state.ui.storeScroll`, `state.ui.hoveredItemId`, `state.ui.focusedTab`, `state.ui.toast`, `state.ui.storeLayout`.
**TDD:** Not applicable.
**Verify:** From menu, click Store → enters STORE. Tab between categories with arrows and clicks. Esc returns to MENU. Keyboard nav covers every card.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 8.3: Store draw functions and purchase logic

**Owner:** Storm (draw), Wolverine (buy/equip logic)
**Files:** `js/render.js` (modify), `js/store.js` (modify)
**What:** Storm: `drawStore(ctx, state)` per approved mockup. Cards draw canvas preview using existing palette helpers. Locked items render with dim overlay + lock icon. Buy button grayed when `coins < price`. Equipped items show "Equipped ✓". Toast appears top-right on purchase/equip. Wolverine: `Catnip.store.buy(id)` deducts price, adds to `unlockedIds`, persists, shows toast, plays `playPurchaseChime`. `Catnip.store.equip(id)` sets appropriate `equipped.*` field, persists, shows toast.
**TDD:** Not applicable.
**Verify:** All catalog items visible as cards. Insufficient coins → Buy grayed, no deduction. Sufficient coins → Buy deducts correctly, chime plays, toast appears. Equipping changes rendered cat/ball/arena on next PLAY entry. Close browser and reopen → purchases and equipped state preserved.
**Risk:** MEDIUM
**Approval Gate:** Store UI mockup approval (already granted)

### Task 8.4: Toast and error states

**Owner:** Storm
**Files:** `js/render.js` (modify), `js/store.js` (modify)
**What:** Implement `state.ui.toast = { text, color, untilTime }`. Three styles: success (green, on purchase/equip), error (red, on insufficient-funds attempt), info (gray, on already-equipped click). Toasts auto-dismiss after 2s.
**TDD:** Not applicable.
**Verify:** Trigger each toast type; observe color and 2s dismiss timing.
**Risk:** LOW
**Approval Gate:** None

### Task 9.1: Cross-feature integration and acceptance walkthrough

**Owner:** Wolverine (logic), Storm (visual)
**Files:** None (verification task)
**What:** Run full acceptance walkthrough against every criterion. Document results in `.cerebro/notepads/catnip-expansion/verification.md`. Specifically exercise:
  - Shield + magnet, shield + explosive, multi-ball + per-frame hit cap
  - Game-over while power-up ball in flight
  - `artifact-iron-claw` + multi-ball, `artifact-lucky-paw` + explosive, `artifact-slow-mo` + tier triggers
  - localStorage cleared mid-session, localStorage corrupted, equipped artifact referencing non-existent ID
  - Cat passing through bumper
  - Pause (P) during ability + multi-ball + moving bumpers → unpause resumes cleanly
**TDD:** Not applicable.
**Verify:** Every acceptance criterion checkbox ticked in `verification.md`.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 9.2: Performance audit

**Owner:** Wolverine
**Files:** None (audit task)
**What:** With multi-ball in flight + 5 bumpers + active ability + active particles, profile in Chrome DevTools. Verify: no frame > 16.7ms in steady state, global particle count never exceeds 200 (FIFO cull), trail arrays never exceed 12 entries, no per-frame heap allocation in physics hot path.
**TDD:** Not applicable.
**Verify:** Profiler shows no GC pauses > 4ms; sustained 60fps under load. Document worst-case frame times in `verification.md`.
**Risk:** MEDIUM
**Approval Gate:** None

### Task 9.3: README update

**Owner:** Wolverine
**Files:** `README.md` (modify)
**What:** Document: how to play (open `index.html` from `file://`), controls, new features (store, power-ups, abilities, bumpers), localStorage usage and how to wipe save. Note classic `<script>` tag architecture preserves file:// playability.
**TDD:** Not applicable.
**Verify:** README reads accurately; `index.html` opens from `file://` in Chrome/Firefox/Safari per documented support.
**Risk:** LOW
**Approval Gate:** None

## Rollback / Recovery

- **Pre-Phase-1 checkpoint:** `index.html.v1-backup` (Task 1.0) is the single-file fallback. Full rollback: `cp index.html.v1-backup index.html && rm -rf js/`. If git repo exists, `git checkout v1-pre-split -- index.html && rm -rf js/`.
- **Per-phase rollback within Phase 1:** Each Task 1.2–1.7 leaves `index.html` in a runnable state. Revert a phase's files and restore the affected inline JS block from `index.html.v1-backup`.
- **Corrupted localStorage at runtime:** `loadState()` detects malformed JSON, missing keys, or invalid values and resets to defaults. User-side recovery: `localStorage.removeItem('catnip:save:v1')` in DevTools.
- **Schema migration on future version bumps:** v1→v2 migrations written in `js/store.js` migration table; old saves auto-migrate. Failed migration falls back to defaults.
- **Power-up regression in Phase 5:** Set spawn distribution to `1.0 normal` in `js/state.js` to disable power-ups without removing queue infrastructure.
- **Cat ability regression in Phase 7:** Setting `state.persistent.abilitiesEnabled = false` in console disables triggering globally; existing in-flight ability completes safely.
- **Bumper regression in Phase 6:** Setting `arena.bumperLayout.count = 0` in catalog removes bumpers for that arena.
- **Store UI bug blocks gameplay:** Force-route MENU → PLAY by skipping STORE in menu button list. PLAY never depends on STORE.

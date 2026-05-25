# Cerebro Project Context

**Indexed At:** 2026-05-25
**Repository:** catnip

## Stack

- Language/runtime: Vanilla JavaScript (ES2020) + HTML5 Canvas 2D API + Web Audio API
- Frameworks: None — zero dependencies, no build step
- Package manager: None
- Test framework: None — manual browser verification only; Node.js static string checks for quick CI-free validation
- Build system: None — open `index.html` directly in a browser

## Entrypoints

- Application: `index.html` — single file containing all HTML, CSS, and JS (~1 300+ lines inline)
- CLI/scripts: None
- Tests: None (manual; see `.cerebro/notepads/catnip-game/verification.md`)
- Configuration: `localStorage` key `catnip_muted` — persists mute preference across sessions

## Commands

- Install: None required — open `index.html` in any modern browser
- Test: `open /Users/quang.bui/workspace/projects/catnip/index.html` (macOS) then play manually
- Focused test: `node -e "const h=require('fs').readFileSync('index.html','utf8'); console.log('CAT_RADIUS=24', h.includes('CAT_RADIUS = 24'))"`
- Lint: `git diff --check` (whitespace only)
- Typecheck: Not applicable
- Build: Not applicable
- Run/dev: `open index.html` or any local HTTP server (e.g. `python3 -m http.server 8000`)

## Architecture

- `index.html` — entire game: constants, state, game loop, physics, rendering, audio, input, menus
  - **Constants block** (top of script): ALL_CAPS names, grouped by category (canvas size, cat physics, ball physics, guide, UI)
  - **Game state machine**: `GameState` enum (`MENU`, `PLAYING`, `SETTINGS`, `GUIDE`); `currentState` drives which draw/update path runs each frame
  - **Game loop**: `requestAnimationFrame` with `dt = Math.min(now - lastTime, 33) / 1000` — cap prevents tunneling on tab-switch
  - **Cat entity**: `{x, y, vx, vy, speed, r}` — bounces all 4 walls with position-clamping, velocity rescaling on speed-up
  - **Ball entities**: `activeBalls[]` — slingshot-launched, wall-bouncing with two-phase speed decay (`BALL_DECAY_EARLY` / `BALL_DECAY_LATE`), trail array (8 positions), removed below `BALL_MIN_SPEED`
  - **Thrower**: Fixed at `(W/2, H/2)` — renders as purple launcher platform
  - **Collision**: Circle vs circle `dx² + dy² ≤ (rCat + rBall)²` — hit awards score `1 + b.bounces`, +2 balls, cat speed×1.18 (capped at `CAT_MAX_SPEED`)
  - **Aim guide**: `computeTrajectory()` step-simulation with bounce-segment coloring up to `GUIDE_MAX_BOUNCES`
  - **Visual FX**: particle burst on hit (`spawnHitParticles`), screen shake, combo popups with punch-in scale animation, twinkling starfield, pulsing HSL walls
  - **Audio**: Web Audio API — lazy-init on first user gesture; `playLaunch`, `playBounce`, `playCatHit` (pitch scales with bounce count), `playGameOver`; `masterGain` gates mute
  - **Menu system**: `drawMenu`, `drawSettings`, `drawGuide` — keyboard nav (arrows + Enter) and pointer hover tracked via `menuFocusIndex` / `menuHoverIndex`
  - **HUD**: score (gold), ball count (green / red when ≤1), mute button (top-right)
  - **Persistence**: `localStorage.getItem('catnip_muted')` — boolean, written on every toggle

## Conventions

- File organization: Single `index.html` — do not split unless file exceeds a natural threshold (~2000 lines); all changes go to this one file
- Naming: ALL_CAPS constants; camelCase functions (`drawCat`, `stepBall`, `updateBalls`); plain `let` for mutable game state
- Canvas / DPR: CSS dimensions in stylesheet only (never JS); backing store = `W * dpr` / `H * dpr`; `ctx.scale(dpr, dpr)` once at init
- Input coordinates: `e.clientX - rect.left` (CSS space) — no DPR correction needed anywhere
- Pointer capture: `canvas.setPointerCapture(e.pointerId)` on `pointerdown` for reliable drag; `pointercancel` always clears `drag`/`dragCurrent`
- Slingshot direction: throw vector = `dragStart − dragCurrent` (NOT end−start); inverted = opposite of pull
- Ball removal: iterate `toRemove[]` in reverse before `splice()` to preserve indices
- Error handling: none needed — closed system with no external I/O beyond `localStorage` and Web Audio
- Testing: manual browser walk-through against acceptance criteria in the plan; no automated tests

## Risky Areas

- **Ball tunneling** — fast balls can pass through walls or cat in one frame; the 2-sub-step guard (`displacement > BALL_RADIUS ? 2 : 1`) must remain intact; removing it causes silent tunneling at high speeds
- **Wall oscillation** — after velocity inversion, position must be clamped back inside bounds or the ball gets stuck toggling at the boundary forever
- **dt cap** — `Math.min(now - lastTime, 33)` must cap at 33ms; removing it causes entities to teleport off-screen after a tab switch
- **DPR canvas reset** — never call `canvas.style.width/height` in JS after `ctx.scale(dpr,dpr)` is set; it silently resets the canvas buffer
- **Audio lazy-init** — `AudioContext` must not be created before a user gesture (autoplay policy); `initAudio()` is called only from pointer/key handlers
- **Velocity rescaling** — after changing `cat.speed`, always rescale `vx/vy` to preserve direction: `cat.vx = (cat.vx / curSpeed) * cat.speed`; skipping this causes cat to drift to zero speed
- **Combo index removal** — `toRemove[]` must be iterated in reverse when splicing `activeBalls`

## Agent Notes

- Prefer: edit `index.html` in place — all game logic, rendering, and audio live there
- Prefer: read `.cerebro/notepads/catnip-game/gotchas.md` before touching physics or collision code
- Prefer: open `index.html` in a browser and play manually to verify any rendering or gameplay change
- Prefer: read `.cerebro/plans/catnip-game.md` for the canonical acceptance criteria before marking a feature complete
- Avoid: creating separate JS/CSS files unless the single-file approach becomes genuinely unwieldy
- Avoid: any build tooling, bundlers, or npm packages — zero-dependency is a hard constraint
- Avoid: touching `canvas.style.width` or `canvas.style.height` in JavaScript
- Open questions: high-score persistence via `localStorage` was a non-goal in v1 — may be added in a future plan

## Read First (Priority Order)

**Before any game change:**
1. `index.html` — entire game source (constants block at top gives the full physics parameter set)
2. `.cerebro/notepads/catnip-game/gotchas.md` — tunneling, oscillation, direction inversion, velocity rescaling
3. `.cerebro/notepads/catnip-game/conventions.md` — DPR pattern, game loop, pointer input, color palette

**Before planning or scoping:**
4. `.cerebro/plans/catnip-game.md` — accepted plan, non-goals, acceptance criteria, approval gates
5. `.cerebro/notepads/catnip-game/verification.md` — how to verify the game is working

**Before extending the framework:**
6. `CLAUDE.md` — Cerebro intent gate, team routing, team run manifest rules
7. `.cerebro/schemas/team-run.schema.json` — manifest contract

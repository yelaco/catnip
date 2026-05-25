# Catnip — 2D Browser Survival Game

**Objective:** Ship a single-file vanilla JS + HTML5 Canvas browser game where the player slingshots catnip balls at a wall-bouncing cat for as high a score as possible until they run out of balls.
**Risk Level:** LOW

## Assumptions and Decisions

- **Tech stack:** Vanilla JavaScript + HTML5 Canvas, single `index.html` with inline `<script>` and `<style>`. No build step, no dependencies, no framework. Rationale: scope is tiny, "surprise me" was the user instruction, and zero-dependency canvas is the most delightful demo — open the file, play.
- **File layout:** Single `index.html` at repo root. No separate JS/CSS files (keeps the "surprise" frictionless). If the file grows past ~400 lines, Wolverine may split into `index.html` + `game.js` — Wolverine's call.
- **Canvas size:** 800×600 CSS pixels, scaled by `devicePixelRatio` for crisp rendering on high-DPI displays.
- **Thrower position:** Fixed at bottom-center (x = W/2, y = H − 40), rendered as a simple platform/circle.
- **Cat:** Filled circle, radius 24, with two small triangle ears and eyes for personality (pure canvas drawing, no images). Starts at a random position in the top half of the canvas. Initial speed: 180 px/s. Speed multiplier: ×1.08 per hit, capped at ×3.0 (≈540 px/s) to keep the game playable.
- **Catnip ball:** Filled circle, radius 8, green. Bounces off all 4 walls. Disappears after 3 wall bounces OR on cat hit (whichever first).
- **Ball economy:** Start with 5 balls. Each cat hit awards +2 balls. UI shows: `Balls: N` and `Score: N`.
- **Input:** Mouse/pointer drag on the canvas. `pointerdown` near the thrower (or anywhere — easier) starts a drag; `pointermove` updates the slingshot vector; `pointerup` releases. Drag vector is inverted (slingshot pulls back). Minimum drag distance: 20 px (below that, the throw is cancelled — the ball is not consumed). Max effective drag: 200 px → max throw speed ≈ 700 px/s.
- **Aim guide:** While dragging, render a faint dotted line from thrower in the projected launch direction. Low effort, big UX gain.
- **Lose condition:** `ballsRemaining == 0` AND `activeBalls.length == 0`. Show "Game Over — Score: N — Press R to restart" overlay.
- **Restart:** Press `R` key OR click overlay → reset state and play again.
- **Frame loop:** `requestAnimationFrame`, `dt = clamp(now − last, 0, 33ms)` to prevent tunneling on tab-switch.
- **Collision:** Circle-vs-circle (`dx² + dy² ≤ (rCat + rBall)²`). For ball vs wall, invert velocity component and clamp position back inside.
- **Velocity cap / sub-step:** If a ball's per-frame displacement exceeds its radius, perform 2 sub-steps that frame. Prevents tunneling through the cat at high speed.
- **No audio, no sprites, no persistence, no touch.** Explicit non-goals (below).

## Non-Goals

- Mobile / touch input (desktop pointer only for v1).
- Sound effects, music.
- Sprite/image assets — pure canvas drawing.
- High-score persistence (localStorage) — out of scope.
- Pause menu, settings screen, multiple levels.
- Build tooling, bundlers, TypeScript, frameworks.
- Automated browser tests (Playwright/Cypress) — manual verification only; the scope does not justify CI infrastructure.

## Approval Gates

- [ ] None

This is a greenfield single-file demo with no destructive, privileged, external, or data actions. No gates required.

## Acceptance Criteria

- [ ] Opening `index.html` in a modern browser (Chrome/Firefox/Safari current) renders a 800×600 canvas with a visible cat moving and bouncing off all four walls.
- [ ] Cat does not pass through any wall when observed for 30 seconds straight.
- [ ] Dragging on the canvas shows a dotted aim guide; releasing throws a catnip ball in the inverted drag direction with magnitude proportional to drag distance.
- [ ] A drag shorter than 20 px does NOT consume a ball.
- [ ] Catnip balls bounce off all four walls and visually disappear after exactly 3 wall bounces if they never hit the cat.
- [ ] Hitting the cat increments the score by 1, increases cat speed by ~8% (capped at ×3), and adds +2 to the ball count.
- [ ] Ball counter and score are visible at all times in the top-left corner.
- [ ] When ball count reaches 0 AND no balls are in flight, a "Game Over — Score: N — Press R to restart" overlay appears.
- [ ] Pressing R or clicking the overlay restarts the game from initial state.
- [ ] On a high-DPI (retina) display, text and shapes are crisp, not blurry (devicePixelRatio handling works).
- [ ] No JavaScript console errors during a 2-minute play session.

## Tasks

### Task 1: Create `index.html` scaffold and canvas setup

**Owner:** Wolverine
**Files:** `index.html` (create)
**What:** Scaffold the HTML document with `<title>Catnip</title>`, minimal CSS to center the canvas on a dark background, a `<canvas id="game">` element, and an inline `<script>` block. Inside the script: grab the canvas, set up `devicePixelRatio` scaling (CSS size 800×600, backing store scaled by `dpr`, `ctx.scale(dpr, dpr)`), and render a single static frame (clear + draw a placeholder rectangle) to prove the canvas works.
**TDD:** Not applicable: vanilla browser code with no test runner in scope. Verification is by opening the file.
**Verify:** `open /Users/quang.bui/workspace/projects/catnip/index.html` (macOS) — confirm a dark page with a crisp 800×600 canvas appears and no console errors in DevTools.
**Risk:** LOW
**Approval Gate:** None

### Task 2: Implement game loop, cat entity, and wall bounce

**Owner:** Wolverine
**Files:** `index.html` (modify)
**What:** Inside the script, add: (a) a `requestAnimationFrame` loop with `dt = clamp(performance.now() − last, 0, 33) / 1000`; (b) a `cat` object `{x, y, vx, vy, r: 24, speed: 180}` initialized at a random point in the top half; (c) per-frame update that moves the cat by `vx*dt, vy*dt`, then for each axis: if `x − r < 0` or `x + r > W`, invert `vx` and clamp; same for y; (d) render: clear, draw cat as a filled circle with two ear triangles and two eye dots. No catnip yet.
**TDD:** Not applicable.
**Verify:** Open `index.html` and watch for 30 seconds: cat moves, never escapes any wall, never freezes on a wall. Console clean.
**Risk:** LOW
**Approval Gate:** None

### Task 3: Implement slingshot input, catnip ball spawn, wall bounce, expiry

**Owner:** Wolverine
**Files:** `index.html` (modify)
**What:** Add pointer event handlers on the canvas: `pointerdown` records `dragStart = {x, y}` and calls `canvas.setPointerCapture(e.pointerId)`; `pointermove` records `dragCurrent`; `pointerup` computes `vec = dragStart − dragCurrent` (inverted), magnitude `m = clamp(|vec|, 0, 200)`. If `m < 20`, cancel — do not spawn or consume a ball. Otherwise: spawn a ball at the thrower position with velocity `(vec / |vec|) * (m / 200) * 700`, decrement `ballsRemaining`. Ball update: integrate motion, bounce off walls (invert + clamp + increment `bounceCount`), despawn when `bounceCount >= 3`. Sub-step if `|v|*dt > r`. Render aim guide as a dotted line while dragging.
**TDD:** Not applicable.
**Verify:** Open `index.html`. (1) Drag and release — ball flies in opposite of drag direction with magnitude matching drag length. (2) Very short drag (<20 px) — no ball spawns, ball count unchanged. (3) Throw 5 balls without hitting the cat — counter reads `Balls: 0` and balls visibly bounce up to 3 times then disappear. (4) Aim guide visible only during drag. (5) Console clean.
**Risk:** LOW
**Approval Gate:** None

### Task 4: Implement collision, scoring, speed-up, ball refill, lose state, restart

**Owner:** Wolverine
**Files:** `index.html` (modify)
**What:** Each frame, for every active ball, test circle-vs-circle collision against the cat (`dx² + dy² ≤ (rCat + rBall)²`). On collision: remove the ball, `score += 1`, `ballsRemaining += 2`, `cat.speed = min(cat.speed * 1.08, 540)`, rescale `(cat.vx, cat.vy)` to preserve direction at the new speed. Render HUD in top-left: `Score: N` and `Balls: N` using `ctx.fillText` with a clean sans-serif. Lose check each frame: if `ballsRemaining === 0 && activeBalls.length === 0`, set `gameOver = true` and render a semi-transparent overlay with "Game Over — Score: N — Press R to restart". Add a global `keydown` for `R` and a `click` on the canvas while `gameOver` to reset all state (cat, balls, score, multiplier) and resume.
**TDD:** Not applicable.
**Verify:** Open `index.html`. (1) Hit the cat — score increments, cat visibly speeds up, ball count goes up by 2 (net +1 since the ball was consumed). (2) Hit the cat 20+ times — speed caps and does not become unplayable. (3) Miss every ball until `Balls: 0` and no balls in flight — overlay appears. (4) Press R — game resets to initial state (Score: 0, Balls: 5, cat at slower speed). (5) Console clean during a 2-minute session.
**Risk:** LOW
**Approval Gate:** None

### Task 5: Polish pass and acceptance walk-through

**Owner:** Wolverine
**Files:** `index.html` (modify), `README.md` (modify — add a short "Play" section pointing to `index.html`)
**What:** Walk through every Acceptance Criterion in order and tick them off in this plan or in the notepad. Tweak colors/sizes for readability if needed (e.g., ensure HUD text contrasts the background). Add a one-line page title/header above the canvas: "Catnip — don't miss." Update `README.md` with a short "Play the Game" section: `open index.html` and basic controls.
**TDD:** Not applicable.
**Verify:** Manually re-run every Acceptance Criterion above. All must pass. Then `git diff --check` for whitespace issues.
**Risk:** LOW
**Approval Gate:** None

## Rollback / Recovery

- If any task produces a broken `index.html`, delete the file and re-run the previous task's commit. Single-file scope means rollback is `rm index.html` + `git checkout -- index.html`.
- No data, no migrations, no external services. Recovery is trivial.

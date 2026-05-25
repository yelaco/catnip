# Recon: Catnip Ability Overhaul — Complete Codebase Findings

## 1. Every Location Where 'teleport' Appears

### constants.js
- **Line 43:** `ABILITY_TIER_TELEPORT: 2.9` — speed threshold to trigger teleport (2.9x initial speed)
- **Line 46:** `ABILITY_DURATION_TELEPORT: 0.3` — duration of fade phase (300ms)
- **Line 49:** `ABILITY_COOLDOWN_TELEPORT: 15` — cooldown after teleport (15 seconds)

### state.js
- **Line 93:** `abilityCooldowns: { shield: 0, clone: 0, teleport: 0 }` — cooldown tracking in cat state initialization

### entities.js
- **Line 27:** `abilityCooldowns: { shield: 0, clone: 0, teleport: 0 }` — cooldown tracking in makeCat function

### abilities.js
- **Lines 110–115:** `_activateAbility('teleport')` — activation sets `activeAbility = 'teleport_fade'`, `abilityTimer = 0.3`, cooldown = 15s, queues audio 'abilityTone:2'
- **Line 150:** `cat.abilityCooldowns.teleport = Math.max(0, cat.abilityCooldowns.teleport - dt)` — cooldown decrement in updateAbilities
- **Lines 154–158:** Active ability expiry handler for 'teleport_fade' phase:
  ```javascript
  if (cat.activeAbility === 'teleport_fade') {
    // Phase 2: reposition and switch to appear phase
    _repositionCatRandom(cat, state);
    cat.activeAbility = 'teleport_appear';
    cat.abilityTimer = 0.15;
  }
  ```
- **Line 188:** Speed tier check `if (ratio > C.ABILITY_TIER_TELEPORT && cat.abilityCooldowns.teleport === 0) { _activateAbility(cat, 'teleport', state); }`
- **Line 197:** Queue pending ability if teleport is higher priority: `var want = ratio > C.ABILITY_TIER_TELEPORT ? 'teleport' : ...`

### render.js
- **Lines 775–791:** `drawCat` teleport visual overlay — draws pulsing rings around cat when `activeAbility === 'teleport_fade' || activeAbility === 'teleport_appear'`:
  ```javascript
  var telePulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() * 0.012));
  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = 'rgba(167,139,250,0.9)';
  ctx.strokeStyle = 'rgba(167,139,250,' + telePulse + ')';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = telePulse * 0.4;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ```

### audio.js
- **Line 107:** Comment: `// toneIndex: 0=shield(400Hz square), 1=clone(600Hz square), 2=teleport(800Hz square)` — audio mapping reference

---

## 2. Current Clone Object Shape (Spawned in abilities.js)

### From abilities.js Line 105
```javascript
state.run.clones.push({ 
  x: cx2,              // random x position (validated for bumper/cat spacing)
  y: cy2,              // random y position (validated for bumper/cat spacing)
  r: cat.r,            // radius — same as cat radius (24px)
  age: 0,              // current lifetime elapsed
  lifetime: C.ABILITY_DURATION_CLONE  // total duration (3.0 seconds)
});
```

**Fields:**
- `x, y`: Position in arena (validated by 40-attempt placement loop to avoid bumpers + keep 3×CAT_RADIUS distance from cat)
- `r`: Radius = CAT_RADIUS (24px) — same physical size as cat
- `age`: Accumulates per frame in updateClones (incremented by dt in physics.js:265)
- `lifetime`: Fixed to 3.0 seconds per constant — clones auto-remove when age >= lifetime

---

## 3. Full Body of updateClones (physics.js Lines 261–268)

```javascript
function updateClones(state, dt) {
  const clones = state.run.clones;
  if (!clones) return;
  for (let i = clones.length - 1; i >= 0; i--) {
    clones[i].age += dt;
    if (clones[i].age >= clones[i].lifetime) clones.splice(i, 1);
  }
}
```

**Behavior:**
- Iterates **reverse** to safely splice during loop
- Increments `age` by delta time each frame
- **Auto-removes** clone when age exceeds lifetime
- **No movement logic** — clones are static (fixed position for 3 seconds, then vanish)

---

## 4. Clone-Ball Collision Block (physics.js Lines 238–258)

```javascript
// Clone-ball collision — removes clone and ball, no score, no coins
const clones = run.clones;
if (clones && clones.length > 0) {
  const cloneToRemove = [];
  const ballToRemove = [];
  for (let ci = 0; ci < clones.length; ci++) {
    const clone = clones[ci];
    for (let bi = 0; bi < run.activeBalls.length; bi++) {
      const b = run.activeBalls[bi];
      const dx2 = b.x - clone.x;
      const dy2 = b.y - clone.y;
      const radSum2 = clone.r + C.BALL_RADIUS;
      if (dx2 * dx2 + dy2 * dy2 <= radSum2 * radSum2) {
        if (cloneToRemove.indexOf(ci) === -1) cloneToRemove.push(ci);
        if (ballToRemove.indexOf(bi) === -1) ballToRemove.push(bi);
      }
    }
  }
  for (let ci2 = cloneToRemove.length - 1; ci2 >= 0; ci2--) clones.splice(cloneToRemove[ci2], 1);
  for (let bi2 = ballToRemove.length - 1; bi2 >= 0; bi2--) run.activeBalls.splice(ballToRemove[bi2], 1);
}
```

**Behavior:**
- Circle-circle distance check: `distance² <= (clone.r + BALL_RADIUS)²`
- On collision: removes clone AND ball simultaneously (no score, no coins awarded)
- Uses deduplication arrays to prevent multi-removal in same frame
- Splices in **reverse** to preserve indices

---

## 5. Where Real Cat Hit is Processed (physics.js Lines 128–232, in checkCollisions)

### Core Hit Detection (Lines 137–143)
```javascript
for (let i = 0; i < ballCount; i++) {
  const b = run.activeBalls[i];
  const dx = b.x - cat.x;
  const dy = b.y - cat.y;
  const dist2 = dx * dx + dy * dy;
  const radSum = cat.r + C.BALL_RADIUS;
  if (dist2 > radSum * radSum) continue;  // No collision
```

### Hit Processing When Shield Is Active (Lines 146–173)
- Explosive: detonates visually, no score/coins, ball removed
- Normal/Multiball: reflects off shield using `v' = v - 2*(v·n)*n`
- Tracks `shieldReflectCount` per ball — auto-despawns after 3 reflections

### Hit Processing When No Shield (Lines 175–231)
```javascript
// Per-frame cap: only one hit awards score/coin per frame (Beast flag 2)
if (!run.catHitThisFrame) {
  run.catHitThisFrame = true;
  const earned = 1 + b.bounces;
  run.score += earned;                    // Award score: 1 + bounces
  run.ballsRemaining += C.BALLS_PER_HIT;  // +2 balls
  
  // Coin award: +1 base + artifact bonus
  const coinBonus = window.Catnip.abilities ? window.Catnip.abilities.getCoinBonus(state) : 0;
  const coinsEarned = 1 + coinBonus;
  state.persistent.coins += coinsEarned;
  state.persistent.lifetimeCoins += coinsEarned;
  if (window.Catnip.store) window.Catnip.store.saveState();
  
  // Refill powerup queue
  if (pw) pw.refillQueue(state, C.BALLS_PER_HIT);
  
  run.catHitFlash = 0.3;      // Visual flash
  run.screenShake = 8;        // Screen shake effect
  
  // Queue audio
  run.pendingAudio.push('cat_hit:' + b.bounces);
  
  window.Catnip.entities.spawnHitParticles(cat.x, cat.y, state);
  
  // Speed up cat
  cat.speed = Math.min(cat.speed * C.CAT_SPEED_MULTIPLIER, C.CAT_MAX_SPEED);
  const curSpeed = Math.hypot(cat.vx, cat.vy);
  if (curSpeed > 0) {
    cat.vx = (cat.vx / curSpeed) * cat.speed;
    cat.vy = (cat.vy / curSpeed) * cat.speed;
  }
  
  // Combo popup
  if (b.bounces > 0) {
    run.comboPopups.push({
      text: b.bounces + '\xD7 ' + wallWord + '!',
      subtext: '+' + earned,
      x: b.x, y: b.y - 20,
      age: 0, lifetime: 100, bounces: b.bounces,
    });
  }
}
```

### Game-Over Condition (game.js Lines 106–117)
```javascript
// Check lose condition — game over routes to MENU per plan decision
if (state.run.ballsRemaining === 0 && state.run.activeBalls.length === 0) {
  if (!state.run.completionBonusAwarded) {
    state.persistent.coins += 5;
    state.persistent.lifetimeCoins += 5;
    state.run.completionBonusAwarded = true;
    if (window.Catnip.store && window.Catnip.store.saveState) {
      window.Catnip.store.saveState();
    }
  }
  state.run.gameOver = true;
  state.run.pendingAudio.push('gameOver');
}
```

---

## 6. activeBalls Movement and Wall-Bounce Loop (physics.js Lines 23–65, stepBall)

```javascript
function stepBall(b, state, dt) {
  b.x += b.vx * dt;  // Position update
  b.y += b.vy * dt;

  let bounced = false;
  const wJ = C.WALL_THICKNESS / 2;

  // ── Left/Right walls ──────────────────────────────────
  if (b.x - C.BALL_RADIUS < wJ) {
    b.vx = Math.abs(b.vx);  // Reflect rightward
    b.x = wJ + C.BALL_RADIUS;  // Clamp position
    b.bounces++;
    bounced = true;
  } else if (b.x + C.BALL_RADIUS > C.W - wJ) {
    b.vx = -Math.abs(b.vx);  // Reflect leftward
    b.x = C.W - wJ - C.BALL_RADIUS;
    b.bounces++;
    bounced = true;
  }

  // ── Top/Bottom walls ──────────────────────────────────
  if (b.y - C.BALL_RADIUS < wJ) {
    b.vy = Math.abs(b.vy);  // Reflect downward
    b.y = wJ + C.BALL_RADIUS;
    if (!bounced) b.bounces++;  // Only increment once per step if both walls hit
    bounced = true;
  } else if (b.y + C.BALL_RADIUS > C.H - wJ) {
    b.vy = -Math.abs(b.vy);  // Reflect upward
    b.y = C.H - wJ - C.BALL_RADIUS;
    if (!bounced) b.bounces++;
    bounced = true;
  }

  // ── Decay on bounce ───────────────────────────────────
  if (bounced) {
    state.run.pendingAudio.push('bounce');
    const _spd = Math.hypot(b.vx, b.vy);
    if (_spd > 0) {
      const _factor = b.bounces <= 3 ? C.BALL_DECAY_EARLY : C.BALL_DECAY_LATE;
      b.vx = (b.vx / _spd) * _spd * _factor;
      b.vy = (b.vy / _spd) * _spd * _factor;
    }
  }
}
```

**Integration in updateBalls (lines 75–93):**
- Called per ball multiple times per frame: `for (let s = 0; s < steps; s++) stepBall(b, state, subDt);`
- Sub-stepping used when ball displacement > BALL_RADIUS to avoid wall-clip
- Balls decelerate and are filtered out when speed < BALL_MIN_SPEED

---

## 7. Ball-Ball Collision Check

**Status: DOES NOT EXIST**

- No ball-ball collision detection in the current codebase
- Balls pass through each other without interaction
- Only collisions present: ball-cat, ball-clone, ball-bumper, ball-wall

---

## 8. drawCat Function — Teleport Reference (render.js Lines 516–794)

### Teleport Overlay (Lines 775–791)
**YES, drawCat explicitly references teleport.** The teleport visual appears in the ability overlay section at the end of drawCat:

```javascript
} else if (abilityActive === 'teleport_fade' || abilityActive === 'teleport_appear') {
  var telePulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() * 0.012));
  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = 'rgba(167,139,250,0.9)';
  ctx.strokeStyle = 'rgba(167,139,250,' + telePulse + ')';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = telePulse * 0.4;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
```

**Visual Effect:** Two pulsing concentric rings around cat (8px and 18px outer radius) with purple glow.

---

## 9. drawClones Function (render.js Lines 223–256)

```javascript
function drawClones(ctx, state, palette) {
  const clones = (state.run && state.run.clones) ? state.run.clones : [];
  if (!clones.length) return;
  for (const clone of clones) {
    const lifeFrac = clone.lifetime > 0 ? clone.age / clone.lifetime : 0;
    const alpha = 0.65 * (1 - lifeFrac * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(167,139,250,0.7)';
    ctx.strokeStyle = 'rgba(167,139,250,0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(clone.x, clone.y, clone.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    
    // Draw ghost cat inside clone ring
    const ghostState = { run: { catHitFlash: 0 } };
    const ghostPalette = {
      cat: {
        bodyColor: '#9d7fd4',
        outlineColor: '#6b4fa0',
        earInnerColor: '#c8a0f0',
        eyeColor: '#1a1a2e',
        accessory: null,
      }
    };
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    drawCat(ctx, { x: clone.x, y: clone.y, r: clone.r, activeAbility: null, vx: 0, vy: 0 }, ghostState, ghostPalette);
    ctx.restore();
  }
}
```

**Visual Components:**
1. **Dashed ring** around clone: purple (`rgba(167,139,250,0.85)`), 2.5px wide, [6,5] dash pattern, 6px offset from clone.r
2. **Ghost cat silhouette** at clone position: purple palette (bodyColor `#9d7fd4`), opacity = `alpha * 0.6`
3. **Fade effect**: alpha decays as `0.65 * (1 - lifeFrac * 0.5)` over lifetime
4. **Shadow blur**: 18px purple glow

---

## 10. window.Catnip.physics Exported Functions (physics.js Lines 415–426)

```javascript
window.Catnip.physics = {
  updateCat: updateCat,
  stepBall: stepBall,
  updateBalls: updateBalls,
  checkCollisions: checkCollisions,
  updateComboPopups: updateComboPopups,
  updateParticles: updateParticles,
  updateBumperPhysics: updateBumperPhysics,
  updateClones: updateClones,
  computeTrajectory: computeTrajectory,
};
```

**Confirmation:** `updateClones` **IS exported** and is called from game.js line 92:
```javascript
if (window.Catnip.physics.updateClones) window.Catnip.physics.updateClones(state, dt);
```

---

## Summary of Key Findings

### Teleport System
- **2-phase mechanism**: fade (0.3s) → reposition → appear (0.15s)
- **Trigger:** Speed ratio > 2.9x initial speed, cooldown = 15s
- **Visuals:** Two pulsing rings around cat in render.js drawCat
- **References:** constants (3 lines), state (2), entities (1), abilities (7), render (1), audio comment (1)

### Clone System
- **Static behavior:** No movement, fixed position for 3 seconds
- **Shape:** { x, y, r=24, age, lifetime=3.0 }
- **Rendering:** Dashed ring + ghost cat silhouette, fading over lifetime
- **Collision:** Ball-clone destroys both (no score/coins)

### Physics
- **Ball movement:** Position += velocity × dt, wall bounce with decay (0.92/0.55)
- **Clone update:** Increment age, auto-remove at lifetime expiry
- **No ball-ball collisions** currently exist

### Render
- **drawClones:** Lines 223–256, full function provided
- **drawCat teleport overlay:** Lines 775–791, two concentric rings, purple glow

---

## Files Ready for Modification

1. **abilities.js** — Remove teleport trigger logic (lines 110–115, 150, 154–158, 188–189, 197)
2. **physics.js** — Add ball-ball collision, enhance clone movement if needed
3. **render.js** — Remove teleport visual overlay (lines 775–791), optionally enhance clone rendering
4. **constants.js** — Remove ABILITY_TIER_TELEPORT, ABILITY_DURATION_TELEPORT, ABILITY_COOLDOWN_TELEPORT
5. **state.js** — Remove teleport from abilityCooldowns initialization
6. **entities.js** — Remove teleport from abilityCooldowns in makeCat

All locations cross-referenced and validated.

# Gotchas — catnip-expansion

## abilities.js: > (strict) for speed-tier thresholds

Use `>` (strict greater-than, not `>=`) for all three tier comparisons in `updateAbilities`.

The slow-mo artifact caps cat speed at exactly `2.5 × CAT_INITIAL_SPEED = ABILITY_TIER_DASH`. With the cap applied before the tier check (BUG-4 fix), `ratio = 2.5` exactly. `2.5 > 2.5` is false, so dash does NOT trigger. `2.5 > 2.0` is true, so shield triggers. Net effect: slow-mo suppresses both dash and teleport; only shield can trigger.

**BUG-4 (the real fix):** The actual bug was that the speed cap was applied AFTER the tier check. A cat-hit spike could briefly exceed 2.9× and trigger teleport even with slow-mo equipped. The fix: apply `getEffectiveCatSpeedCap` BEFORE the tier check block.

## getEffectiveCatSpeedCap: dash exemption

`getEffectiveCatSpeedCap(state)` returns `Infinity` when `state.run.cat.activeAbility === 'dash'`. This is Option B (approved): during an active 0.5 s dash window the speed cap is bypassed. Shield and teleport remain subject to the cap.

## Store layout hitTest

Store layout items have shape `{ type, id, bounds: { x, y, w, h } }`. The `hitTest` helper must access `r.bounds`, not `r.x/r.y/r.w/r.h` directly. Pattern: `const b = r.bounds || r;`.

## Multiball split timing

Multiball parent splits on the FIRST wall bounce, not on cat contact. The split is triggered in `updateBalls` when `b.bounces >= 1 && prevBounces < 1`, after `stepBall` has incremented the bounce counter. A multiball reaching the cat without bouncing is treated as a normal ball hit.

## Per-frame cat-hit cap

`state.run.catHitThisFrame` must be reset at the TOP of `frame()` before physics runs. If reset after physics, multiple balls hitting the cat in the same frame still award multiple hits.

## pendingAudio decoupling

Physics/collision code pushes string event keys to `pendingAudio[]`. `audio.drainPendingAudio()` dispatches them once per frame. Physics must never call audio functions directly.

## abilities.js: cap-before-tier ordering is critical

The slow-mo speed cap MUST run BEFORE the tier check in `updateAbilities`. If cap runs after, a speed spike (e.g. 900 px/s from a cat hit) computes `ratio = 5.0` and triggers teleport before the cap brings speed to 450. Both the primary trigger block AND the `pendingAbility` queue block use these comparisons — both must use strict `>`.

## AC5 node-harness limitation

`resetRunState` in `state.js` sets `ballsRemaining = INITIAL_BALLS` (5). The iron-claw bonus is applied in `game.js` (line ~22) after calling `resetRunState`. `game.js` cannot be loaded in Node (DOM required), so AC5 appears to FAIL in Node test harness. It is correct in browser. Always test AC5 in browser or mock the game.js wrapper when testing in Node.

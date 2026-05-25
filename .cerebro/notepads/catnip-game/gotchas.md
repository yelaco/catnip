# Gotchas — Catnip Game

## Sub-step for fast balls
When `speed * dt > BALL_RADIUS`, a ball can tunnel through walls or the cat in a single frame. Use 2 sub-steps:
```js
const steps = displacement > BALL_RADIUS ? 2 : 1;
const subDt = dt / steps;
for (let s = 0; s < steps; s++) stepBall(b, subDt);
```

## Wall bounce clamping
After inverting velocity, also clamp position back inside bounds. Without the clamp, the ball can get stuck oscillating at the wall:
```js
if (b.x - r < 0) { b.vx = Math.abs(b.vx); b.x = r; }
```

## Slingshot direction inversion
The throw vector is `drag.start - drag.end` (NOT `end - start`). The ball goes opposite to pull direction. Normalize before scaling to max speed.

## Velocity rescaling on cat speed-up
After increasing `cat.speed`, rescale `vx/vy` to preserve direction at the new speed:
```js
const curSpeed = Math.sqrt(cat.vx**2 + cat.vy**2);
cat.vx = (cat.vx / curSpeed) * cat.speed;
cat.vy = (cat.vy / curSpeed) * cat.speed;
```

## Collision index removal
When removing multiple balls in the same frame, iterate `toRemove` in reverse order before calling `splice()` to preserve correct indices.

## dt cap prevents tunneling on tab switch
`Math.min(now - lastTime, 33)` caps the frame delta at 33ms (≈30fps equivalent). Without this, resuming after a tab switch would compute a huge dt and fling all entities off-screen.

## Canvas CSS dimensions vs backing store
Never set `canvas.style.width/height` in JS when DPR scaling is used — set CSS dimensions in the stylesheet. Setting them in JS after scaling resets the canvas.

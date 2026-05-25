# Conventions — Catnip Game

## File structure
- Single `index.html` at repo root. Inline `<style>` and `<script>`. No build step, no dependencies.
- Constants block at top of script, ALL_CAPS names, grouped by category.
- Game state in plain mutable `let` variables reset by `resetGame()`.
- Rendering helpers as standalone `drawX()` functions.

## Canvas / DPR pattern
```js
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);
// CSS width/height set in stylesheet, not JS
```

## Game loop
```js
let lastTime = null;
function frame(now) {
  if (lastTime === null) lastTime = now;
  const dt = Math.min(now - lastTime, 33) / 1000; // seconds, capped at 33ms
  lastTime = now;
  // ... update, draw
  requestAnimationFrame(frame);
}
resetGame();
requestAnimationFrame(frame);
```

## Pointer input pattern
- Use `canvas.setPointerCapture(e.pointerId)` on pointerdown for reliable drag tracking.
- `pointercancel` handler always clears `drag` and `dragCurrent`.
- Coordinates come from `e.clientX - rect.left` (no DPR correction needed — CSS coordinates used throughout).

## Color palette
- Background: `#0d0d0f`
- Cat body: `#e8a84a`, outline `#c07830`
- Ball: `#4ade80`, outline `#16a34a`
- Thrower: `#6366f1` / `#818cf8`
- HUD normal: `#f0f0f0`, low balls: `#f87171`

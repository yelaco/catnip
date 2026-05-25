# Verification — Catnip Game

## Open the game
```bash
open /Users/quang.bui/workspace/projects/catnip/index.html
```
Expected: dark page, "Catnip — don't miss." header, 800×600 canvas with an orange cat bouncing around.

## Node.js static checks (no browser needed)
```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['CAT_RADIUS = 24', html.includes('CAT_RADIUS = 24')],
  ['BALL_RADIUS = 8', html.includes('BALL_RADIUS = 8')],
  // ... add more
];
"
```

## Acceptance criteria checklist (manual, browser)
1. Canvas renders at 800×600 CSS px; shapes crisp on retina display
2. Cat bounces off all 4 walls for 30 seconds without escaping
3. Drag shows dotted aim guide; release throws in inverted direction
4. Short drag (<20px) = no ball consumed, ball count unchanged
5. Ball disappears after 3 wall bounces if no hit
6. Cat hit = score +1, balls +2, cat speeds up
7. HUD shows Score and Balls at all times
8. Game Over overlay when balls=0 and no balls in flight
9. R key or clicking overlay resets game fully
10. No JS console errors during 2-minute session

## Whitespace check
```bash
git diff --check
```
